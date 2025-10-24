#!/usr/bin/env python3
"""
PaddleOCR Receipt Processing Script
Extracts text from receipt images and attempts to parse structured data
"""

import sys
import json
import re
import requests
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from paddleocr import PaddleOCR

class DutchReceiptParser:
    """Parse Dutch receipts and extract structured information with LLM enhancement"""
    
    def __init__(self):
        # LLM Configuration for field extraction with WSL2/Windows compatibility
        self.llm_config = {
            'endpoints': [
                'http://10.173.239.108:1235/v1',  # LM Studio on local network (primary - Windows with "Serve on Local Network" enabled)
                'http://127.0.0.1:1235/v1',  # Fallback: Direct localhost
                'http://172.24.0.1:1235/v1',  # Fallback: Windows host IP
                'http://host.docker.internal:1235/v1',  # Fallback: WSL2 Docker
            ],
            'model': 'microsoft_-_phi-3.5-mini-instruct',  # Updated model ID
            'timeout': 3,  # Fast fail if LLM service unavailable, fallback to rules
            'max_retries': 2,
            'enable_caching': True
        }
        
        # Add Windows host IP and mDNS hostname for WSL2 compatibility
        try:
            import subprocess
            
            # Method 1: Get Windows host via hostname.local (mDNS)
            hostname_result = subprocess.run(
                ["hostname"], capture_output=True, text=True, timeout=2
            )
            if hostname_result.returncode == 0:
                hostname = hostname_result.stdout.strip()
                self.llm_config['endpoints'].append(f"http://{hostname}.local:1235/v1")

            # Method 2: Get Windows host IP from resolv.conf
            resolv_result = subprocess.run(
                ["cat", "/etc/resolv.conf"],
                capture_output=True, text=True, timeout=2
            )
            for line in resolv_result.stdout.split('\n'):
                if 'nameserver' in line:
                    windows_ip = line.split()[-1]
                    self.llm_config['endpoints'].append(f"http://{windows_ip}:1235/v1")
                    break
        except:
            pass
        # Initialize PaddleOCR with Dutch support, disable document unwarping to avoid issues
        self.ocr = PaddleOCR(
            use_textline_orientation=True, 
            lang='en',  # Using english for better number recognition
            use_doc_unwarping=False,  # Disable document unwarping to avoid axis mismatch error
            use_doc_orientation_classify=False  # Disable document orientation classification for stability
        )
        
        # Dutch VAT rates
        self.vat_rates = [0.06, 0.09, 0.21]
        
        # Enhanced Dutch vendors and service providers patterns
        self.vendor_patterns = [
            # Supermarkets
            r'albert\s*heijn',
            r'jumbo',
            r'lidl',
            r'aldi',
            r'ah\.nl',
            r'plus\s+supermarkt',
            r'spar',
            r'dirk',
            r'coop',
            
            # Telecom/Utilities
            r'kpn',
            r'vodafone',
            r't-mobile',
            r'ziggo',
            r'eneco',
            r'essent',
            r'nuon',
            r'vattenfall',
            r'budget\s*thuis',
            
            # Retail
            r'action',
            r'kruidvat',
            r'etos',
            r'mediamarkt',
            r'coolblue',
            r'bol\.com',
            r'amazon\.nl',
            r'wehkamp',
            r'hema',
            r'blokker',
            
            # Gas stations
            r'shell',
            r'bp\s*station',
            r'total',
            r'esso',
            r'texaco',
            
            # Restaurants/Food delivery
            r'mcdonald',
            r'burger\s*king',
            r'kfc',
            r'domino',
            r'thuisbezorgd',
            r'uber\s*eats',
        ]
        
        # Invoice/receipt indicator patterns
        self.invoice_indicators = [
            r'factuur',
            r'invoice', 
            r'rekening',
            r'nota',
            r'bon',
            r'receipt'
        ]
        
        # Customer/recipient indicators (to avoid false matches)
        self.customer_indicators = [
            r'aan:',
            r'klant:',
            r'naam:',
            r'adres:',
            r'postcode',
            r'to:',
            r'customer:',
            r'bill\s*to',
            r'factuuradres',
            r'bezorgadres'
        ]
        
        # Amount patterns (European format) - prioritize EUR amounts and specific patterns
        self.amount_patterns = [
            # High priority: Explicit EUR amounts and totals
            r'total\s+value[^\d]*?([\d,\.]+)\s*eur',  # "Total Value / Total Valoare: 600.00 EUR"
            r'totaal\s*€?\s*(\d+[,\.]\d{2})',
            r'total\s*€?\s*(\d+[,\.]\d{2})',
            r'te\s*betalen\s*€?\s*(\d+[,\.]\d{2})',
            r'subtotal\s*€?\s*(\d+[,\.]\d{2})',
            # Medium priority: EUR currency indicators
            r'([\d,\.]+)\s*eur(?!.*ron)',  # EUR amounts but not if followed by RON
            r'€\s*(\d+[,\.]\d{2})',
            r'eur\s*(\d+[,\.]\d{2})',
        ]
        
        # VAT patterns
        self.vat_patterns = [
            r'btw\s*21%\s*€?\s*(\d+[,\.]\d{2})',
            r'btw\s*9%\s*€?\s*(\d+[,\.]\d{2})',
            r'btw\s*6%\s*€?\s*(\d+[,\.]\d{2})',
            r'vat\s*21%\s*€?\s*(\d+[,\.]\d{2})',
            r'vat\s*9%\s*€?\s*(\d+[,\.]\d{2})',
            r'vat\s*6%\s*€?\s*(\d+[,\.]\d{2})',
        ]
        
        # Enhanced date patterns with Dutch/English indicators
        self.date_patterns = [
            # Priority patterns with Dutch indicators
            r'factuurdatum[:\s]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
            r'factuur\s*datum[:\s]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
            r'invoice\s*date[:\s]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
            r'datum[:\s]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
            r'date[:\s]*(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})',
            # Dutch date patterns with month names
            r'factuurdatum[:\s]*(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})',
            r'factuur\s*datum[:\s]*(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})',
            r'(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{4})',
            # Standard patterns
            r'(\d{2}[-/\.]\d{2}[-/\.]\d{4})',
            r'(\d{2}[-/\.]\d{2}[-/\.]\d{2})',
            r'(\d{4}[-/\.]\d{2}[-/\.]\d{2})',
        ]
        
        # Dutch month name mappings
        self.dutch_months = {
            'januari': '01', 'februari': '02', 'maart': '03', 'april': '04',
            'mei': '05', 'juni': '06', 'juli': '07', 'augustus': '08',
            'september': '09', 'oktober': '10', 'november': '11', 'december': '12'
        }

    def extract_text(self, image_path: str) -> List[Tuple[str, float]]:
        """Extract text from image using PaddleOCR"""
        try:
            # Use the new predict() method as recommended by PaddleOCR 3.x
            results = self.ocr.predict(image_path)
            
            if not results:
                return []
            
            # Extract text and confidence scores from the result object
            text_results = []
            for result in results:
                # Access the OCR results from the result object
                if hasattr(result, 'json') and result.json:
                    ocr_data = result.json.get('res', {})
                    rec_texts = ocr_data.get('rec_texts', [])
                    rec_scores = ocr_data.get('rec_scores', [])
                    
                    # Combine texts with their confidence scores
                    for text, confidence in zip(rec_texts, rec_scores):
                        if text and text.strip():  # Only include non-empty text
                            text_results.append((text.strip(), confidence))
                
            return text_results
            
        except Exception as e:
            print(f"Error in OCR extraction: {e}", file=sys.stderr)
            print(f"Image path: {image_path}", file=sys.stderr)
            print(f"Error type: {type(e).__name__}", file=sys.stderr)
            import traceback
            print(f"Full traceback: {traceback.format_exc()}", file=sys.stderr)
            return []

    def parse_vendor(self, text_lines: List[str]) -> Optional[str]:
        """Extract vendor/supplier name from receipt using intelligent parsing"""
        if not text_lines:
            return None
            
        combined_text = ' '.join(text_lines).lower()
        
        # Step 1: Look for company names with legal entities (highest priority for business invoices)
        for i, line in enumerate(text_lines[:8]):  # Check first 8 lines
            line = line.strip()
            if not line:
                continue
                
            # Check for company legal entities (S.R.L., B.V., Ltd, etc.)
            if re.search(r'\b(s\.?r\.?l\.?|b\.?v\.?|n\.?v\.?|ltd|inc|corp|company|bv|nv|srl|llc|gmbh)\b', line.lower()):
                return line.title()
                
            # Check for all-caps company names (common in invoices)
            if (line.isupper() and 
                len(line) > 3 and 
                len(line) < 60 and
                not re.search(r'^\d+', line) and  # Not starting with numbers
                not 'INVOICE' in line and
                not 'FACTUR' in line and
                not 'TOTAL' in line):
                return line.title()
        
        # Step 2: Check for known Dutch vendors/service providers
        for pattern in self.vendor_patterns:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                # Capitalize first letters for display
                vendor = match.group().replace('.', ' ').title()
                return vendor.strip()
        
        # Step 3: Look for vendor patterns near invoice indicators
        for i, line in enumerate(text_lines):
            line_lower = line.lower()
            # If this line contains an invoice indicator
            if any(re.search(indicator, line_lower) for indicator in self.invoice_indicators):
                # Look in previous 3 lines and next 2 lines for vendor name
                search_start = max(0, i-3)
                search_end = min(len(text_lines), i+3)
                for j in range(search_start, search_end):
                    if j == i:  # Skip the invoice indicator line itself
                        continue
                    candidate = text_lines[j].strip()
                    if self._is_likely_vendor_name(candidate, text_lines):
                        return candidate.title()
        
        # Step 4: Smart analysis of top section (header area)
        # Look for the most likely vendor in first 10 lines, excluding customer info
        for i, line in enumerate(text_lines[:10]):
            line = line.strip()
            if not line:
                continue
                
            # Skip if this looks like customer/recipient info
            if self._is_customer_info(line, text_lines, i):
                continue
                
            # Check if this looks like a vendor name
            if self._is_likely_vendor_name(line, text_lines):
                return line.title()
        
        # Step 5: Fallback - look for prominent text in header (but smarter than before)
        for line in text_lines[:5]:
            line = line.strip()
            if (len(line) > 2 and 
                not self._looks_like_address(line) and 
                not self._looks_like_customer_info(line) and
                not re.search(r'^\d+$', line)):  # Not just numbers
                return line.title()
                
        return None

    def parse_description(self, text_lines: List[str]) -> Optional[str]:
        """Extract invoice description/service details"""
        if not text_lines:
            return None
            
        combined_text = ' '.join(text_lines).lower()
        descriptions = []
        
        # Priority 1: Look for explicit service descriptions in table format
        for i, line in enumerate(text_lines):
            line_stripped = line.strip()
            
            # Look for service descriptions that appear to be main items
            if (re.search(r'\b(development|comission|commission|service|consulting|software|design|programming)\b', line.lower()) and
                len(line_stripped) > 10 and
                not re.search(r'^\d+[,\.]\d{2}$', line_stripped) and  # Not just amounts
                not re.search(r'^total', line.lower()) and  # Not total lines
                not re.search(r'circulates|signature|stamp', line.lower())):  # Not legal disclaimers
                
                # Clean the line to extract just the service description
                # Remove leading numbers and trailing amounts/prices
                cleaned = re.sub(r'^(\d+\s+)', '', line_stripped)  # Remove leading item numbers like "1 "
                cleaned = re.sub(r'\s+\d+\.\d{2}.*$', '', cleaned)  # Remove trailing amounts like "600.00"
                cleaned = re.sub(r'\s+(Pcs|pcs|pieces|pc|unit|units).*$', '', cleaned)  # Remove unit indicators
                
                if len(cleaned.strip()) > 5:
                    descriptions.append(cleaned.strip())
        
        # Priority 2: Look for service/product descriptions with indicators
        description_indicators = [
            'beschrijving', 'description', 'omschrijving', 'service', 'dienst',
            'product', 'artikel', 'item', 'subscription', 'abonnement'
        ]
        
        # Extract descriptions from lines with indicators
        for i, line in enumerate(text_lines):
            line_lower = line.lower()
            
            # Check if line contains description indicators
            for indicator in description_indicators:
                if indicator in line_lower:
                    # Look in current line and next few lines for descriptions
                    for j in range(i, min(len(text_lines), i + 3)):
                        desc_line = text_lines[j].strip()
                        
                        # Skip lines that are too short or look like amounts/dates/legal text
                        if (len(desc_line) < 3 or 
                            re.search(r'^\d+[,\.]\d{2}$', desc_line) or  # Amounts
                            re.search(r'^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}$', desc_line) or  # Dates
                            re.search(r'^\d+$', desc_line) or  # Just numbers
                            re.search(r'circulates|signature|stamp|accordance|fiscal|code', desc_line.lower())):  # Legal disclaimers
                            continue
                            
                        # Clean up description
                        desc_cleaned = re.sub(r'^[^a-zA-Z]*', '', desc_line)  # Remove leading non-letters
                        desc_cleaned = re.sub(r'[€$]\s*[\d,\.]+.*$', '', desc_cleaned)  # Remove amounts
                        
                        if len(desc_cleaned.strip()) > 5:
                            descriptions.append(desc_cleaned.strip())
        
        # Look for mobile/telecom specific descriptions
        telecom_patterns = [
            r'mobiel.*abonnement', r'mobile.*subscription', r'gsm.*abonnement',
            r'internet.*abonnement', r'telefoon.*abonnement', r'data.*bundel',
            r'prepaid.*kaart', r'prepaid.*card', r'bel.*bundel', r'call.*bundle'
        ]
        
        for pattern in telecom_patterns:
            matches = re.finditer(pattern, combined_text)
            for match in matches:
                # Get surrounding context
                start = max(0, match.start() - 20)
                end = min(len(combined_text), match.end() + 20)
                context = combined_text[start:end].strip()
                descriptions.append(context.title())
        
        # Look for product lines (lines with quantities, products)
        for line in text_lines:
            line_stripped = line.strip()
            # Skip very short lines, amounts, dates
            if (len(line_stripped) < 8 or
                re.search(r'^\d+[,\.]\d{2}$', line_stripped) or
                re.search(r'^\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}$', line_stripped)):
                continue
                
            # Look for lines that might be product descriptions
            if (re.search(r'\d+\s*x\s*\w+', line_stripped.lower()) or  # Quantity patterns
                re.search(r'(maand|month|jaar|year)', line_stripped.lower()) or  # Time periods
                (len(line_stripped) > 10 and 
                 not self._looks_like_address(line_stripped) and
                 not self._looks_like_customer_info(line_stripped))):
                descriptions.append(line_stripped)
        
        # Return the best description
        if descriptions:
            # Prefer longer, more descriptive entries
            descriptions = [d for d in descriptions if len(d) > 5]
            if descriptions:
                # Priority 1: Look for service/business descriptions
                service_descriptions = [d for d in descriptions if re.search(r'\b(development|comission|commission|service|consulting|software|design|programming|game|unity|subscription|abonnement)\b', d.lower())]
                if service_descriptions:
                    # Remove legal disclaimers from service descriptions
                    clean_service_descriptions = [d for d in service_descriptions if not re.search(r'circulates|signature|stamp|accordance|fiscal|code|article|paragraph', d.lower())]
                    if clean_service_descriptions:
                        # Prefer shorter, cleaner service descriptions over longer generic ones
                        # Sort by business relevance, then by length
                        clean_service_descriptions.sort(key=lambda x: (
                            -len(re.findall(r'\b(development|comission|commission|game|unity)\b', x.lower())),  # More service keywords = higher priority
                            len(x)  # Among equally relevant, prefer shorter
                        ))
                        return clean_service_descriptions[0][:200]
                
                # Priority 2: Filter out addresses and legal disclaimers
                business_descriptions = [d for d in descriptions if not re.search(r'circulates|signature|stamp|accordance|fiscal|code|article|paragraph|sector|b-dul|camera|bl\.|sc\.|ap\.|nr\.|strada|straat', d.lower())]
                if business_descriptions:
                    # Return the longest business description
                    best_desc = max(business_descriptions, key=len)
                    return best_desc[:200]  # Limit length
                else:
                    # Fallback to any description
                    best_desc = max(descriptions, key=len)
                    return best_desc[:200]
                
        return None
    
    def _is_likely_vendor_name(self, candidate: str, all_lines: List[str]) -> bool:
        """Determine if a line is likely to be a vendor name"""
        if not candidate or len(candidate.strip()) < 2:
            return False
            
        candidate = candidate.strip()
        candidate_lower = candidate.lower()
        
        # Skip obvious non-vendor patterns
        if (re.search(r'^\d+[\/\-]\d+[\/\-]\d+', candidate) or  # Dates
            re.search(r'^\d+:\d+', candidate) or  # Times
            re.search(r'^\d+$', candidate) or  # Just numbers
            re.search(r'^€\s*\d+', candidate) or  # Amounts
            re.search(r'pagina|page', candidate_lower) or  # Page numbers
            re.search(r'factuur|invoice', candidate_lower)):  # Invoice labels
            return False
        
        # Positive indicators for vendor names
        score = 0
        
        # Contains company-like terms
        if re.search(r'\b(b\.?v\.?|n\.?v\.?|ltd|inc|corp|company|bv|nv)\b', candidate_lower):
            score += 3
            
        # All caps (common for company names)
        if candidate.isupper() and len(candidate) > 3:
            score += 2
            
        # Mixed case professional formatting
        if re.search(r'^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$', candidate):
            score += 2
            
        # Contains no digits (cleaner company names)
        if not re.search(r'\d', candidate):
            score += 1
            
        # Reasonable length for company name
        if 3 <= len(candidate) <= 50:
            score += 1
            
        return score >= 2
    
    def _is_customer_info(self, line: str, all_lines: List[str], line_index: int) -> bool:
        """Check if this line is likely customer/recipient information"""
        line_lower = line.lower()
        
        # Direct customer indicators
        if any(re.search(indicator, line_lower) for indicator in self.customer_indicators):
            return True
            
        # Check context - if previous or next line has customer indicators
        for i in range(max(0, line_index-1), min(len(all_lines), line_index+2)):
            if i != line_index:
                context_line = all_lines[i].lower()
                if any(re.search(indicator, context_line) for indicator in self.customer_indicators):
                    return True
                    
        return False
    
    def _looks_like_address(self, line: str) -> bool:
        """Check if line looks like an address"""
        line_lower = line.lower()
        return (re.search(r'\d+[a-z]*\s+[a-z\s]+\d+', line_lower) or  # House number + street + postal
                re.search(r'\b\d{4}\s*[a-z]{2}\b', line_lower) or  # Dutch postal code
                re.search(r'straat|laan|plein|weg|kade|singel', line_lower))  # Dutch street terms
    
    def _looks_like_customer_info(self, line: str) -> bool:
        """Quick check if line looks like customer information"""
        line_lower = line.lower()
        return any(keyword in line_lower for keyword in 
                  ['klant', 'customer', 'naam', 'name', 'adres', 'address', 'aan:', 'to:'])

    def parse_amounts(self, text_lines: List[str]) -> Dict[str, Optional[float]]:
        """Extract amounts from receipt"""
        combined_text = ' '.join(text_lines).lower()
        amounts = {
            'total_amount': None,
            'vat_amount': None,
            'net_amount': None
        }
        
        # Find total amount - prioritize EUR amounts over RON conversions
        for pattern in self.amount_patterns:
            matches = re.findall(pattern, combined_text, re.IGNORECASE)
            if matches:
                try:
                    # Convert European format to float
                    amount_str = matches[-1].replace(',', '.')  # Take last match (usually total)
                    candidate_amount = float(amount_str)
                    
                    # Skip very small amounts that are likely parsing errors
                    # unless we haven't found anything yet
                    if amounts['total_amount'] is None or candidate_amount > amounts['total_amount']:
                        amounts['total_amount'] = candidate_amount
                        
                    # If we found a reasonable amount (> 10), prefer it
                    if candidate_amount >= 10.0:
                        amounts['total_amount'] = candidate_amount
                        break
                except ValueError:
                    continue
        
        # Find VAT amount
        for pattern in self.vat_patterns:
            matches = re.findall(pattern, combined_text, re.IGNORECASE)
            if matches:
                try:
                    vat_str = matches[0].replace(',', '.')
                    amounts['vat_amount'] = float(vat_str)
                    break
                except ValueError:
                    continue
        
        # Calculate net amount if we have total and VAT
        if amounts['total_amount'] and amounts['vat_amount']:
            amounts['net_amount'] = amounts['total_amount'] - amounts['vat_amount']
        elif amounts['total_amount'] and not amounts['vat_amount']:
            # Assume 21% VAT if not specified
            amounts['vat_amount'] = round(amounts['total_amount'] * 0.21 / 1.21, 2)
            amounts['net_amount'] = amounts['total_amount'] - amounts['vat_amount']
            
        return amounts

    def parse_date(self, text_lines: List[str]) -> Optional[str]:
        """Extract date from receipt with Dutch month name support"""
        combined_text = ' '.join(text_lines).lower()
        
        for pattern in self.date_patterns:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                groups = match.groups()
                
                # Handle Dutch month names (e.g., "3 januari 2025")
                if len(groups) == 3 and groups[1] in self.dutch_months:
                    try:
                        day = groups[0].zfill(2)
                        month = self.dutch_months[groups[1]]
                        year = groups[2]
                        return f"{year}-{month}-{day}"
                    except (ValueError, KeyError):
                        continue
                
                # Handle numeric dates
                elif len(groups) == 1:
                    date_str = groups[0]
                    try:
                        # Handle different date formats
                        if '/' in date_str:
                            parts = date_str.split('/')
                        elif '-' in date_str:
                            parts = date_str.split('-')
                        elif '.' in date_str:
                            parts = date_str.split('.')
                        else:
                            continue
                            
                        if len(parts) == 3:
                            # Determine which part is year
                            if len(parts[2]) == 4:  # DD/MM/YYYY or DD-MM-YYYY
                                day, month, year = parts
                            elif len(parts[0]) == 4:  # YYYY/MM/DD or YYYY-MM-DD
                                year, month, day = parts
                            elif len(parts[2]) == 2:  # DD/MM/YY
                                day, month, year = parts
                                year = f"20{year}" if int(year) < 50 else f"19{year}"
                            else:
                                continue
                                
                            # Format as YYYY-MM-DD
                            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                            
                    except (ValueError, IndexError):
                        continue
                    
        return None

    def determine_vat_rate(self, vat_amount: float, net_amount: float) -> float:
        """Determine VAT rate from amounts"""
        if not vat_amount or not net_amount or net_amount == 0:
            return 0.21  # Default to 21%
            
        calculated_rate = vat_amount / net_amount
        
        # Find closest standard VAT rate
        closest_rate = min(self.vat_rates, key=lambda x: abs(x - calculated_rate))
        return closest_rate

    def truncate_ocr_text_for_llm(self, ocr_text: str, max_tokens: int = 3500) -> str:
        """Intelligently truncate OCR text to fit LLM context while preserving key information"""
        lines = ocr_text.split('\n')
        
        # Conservative estimate: 1 token ≈ 1 char (more aggressive than actual but safer)
        estimated_tokens = len(ocr_text)
        
        if estimated_tokens <= max_tokens:
            return ocr_text
            
        print(f"OCR text too long ({estimated_tokens} estimated tokens), truncating to {max_tokens} tokens", file=sys.stderr)
        
        # Simple but effective strategy: Take first 30% and last 15% of lines, fill middle with important lines
        total_lines = len(lines)
        
        # Keep first 30% (headers, vendor info, start of transaction details)
        header_count = min(int(total_lines * 0.3), 100)  # Cap at 100 lines
        header_lines = lines[:header_count]
        
        # Keep last 15% (totals, summary)
        footer_count = min(int(total_lines * 0.15), 50)  # Cap at 50 lines  
        footer_lines = lines[-footer_count:] if footer_count > 0 else []
        
        # Calculate how much space we have left for middle content
        header_text = '\n'.join(header_lines)
        footer_text = '\n'.join(footer_lines)
        
        # Reserve space for prompt (~1000 chars) and section separators
        available_chars = max_tokens - len(header_text) - len(footer_text) - 1200
        
        # Find important middle lines (amounts, totals, key info)
        middle_lines = lines[header_count:-footer_count] if footer_count > 0 else lines[header_count:]
        
        # Score and select middle lines
        important_middle = []
        current_chars = 0
        
        # Priority patterns for key information
        priority_patterns = [
            (r'€\s*\d+[.,]\d+', 50),  # Euro amounts - highest priority
            (r'\d+[.,]\d+\s*€', 50),  # Euro amounts (different format)  
            (r'total|subtotal', 40),   # Total lines
            (r'btw|vat|tax', 30),     # Tax information
            (r'factuur|invoice', 20), # Invoice identifiers
            (r'datum|date.*\d{4}', 15), # Dates
        ]
        
        # Score each line
        scored_lines = []
        for i, line in enumerate(middle_lines):
            score = 0
            line_lower = line.lower().strip()
            
            if len(line_lower) < 3:  # Skip very short lines
                continue
                
            # Apply priority scoring
            for pattern, points in priority_patterns:
                if re.search(pattern, line_lower):
                    score += points
            
            # Basic scoring for lines with numbers
            if re.search(r'\d', line):
                score += 5
                
            scored_lines.append((score, line))
        
        # Sort by score (highest first) and select lines that fit
        scored_lines.sort(reverse=True, key=lambda x: x[0])
        
        for score, line in scored_lines:
            line_chars = len(line) + 1  # +1 for newline
            if current_chars + line_chars <= available_chars:
                important_middle.append(line)
                current_chars += line_chars
            if current_chars >= available_chars:
                break
        
        # Combine sections
        middle_text = '\n'.join(important_middle)
        
        if middle_text:
            truncated = f"{header_text}\n\n[... {len(middle_lines) - len(important_middle)} lines truncated ...]\n{middle_text}\n\n[... summary ...]\n{footer_text}"
        else:
            truncated = f"{header_text}\n\n[... {len(middle_lines)} lines truncated ...]\n\n{footer_text}"
        
        # Final check - if still too long, aggressively cut header
        if len(truncated) > max_tokens:
            # Emergency truncation - just take first 50% of target length
            emergency_length = max_tokens // 2
            truncated = ocr_text[:emergency_length] + "\n\n[... text truncated due to length ...]"
        
        # Debug logging
        final_length = len(truncated)
        print(f"Truncated OCR: {total_lines} lines -> {len(header_lines)} header + {len(important_middle)} middle + {len(footer_lines)} footer", file=sys.stderr)
        print(f"Original text: {len(ocr_text)} chars → Truncated: {final_length} chars (target: {max_tokens})", file=sys.stderr)
        
        return truncated

    def extract_fields_with_llm(self, ocr_text: str) -> Optional[dict]:
        """Use Phi-3.5-mini for intelligent field extraction from OCR text"""
        
        # Truncate OCR text to fit within LLM context limits
        truncated_text = self.truncate_ocr_text_for_llm(ocr_text)
        
        # Create chat messages for proper Phi-3.5-mini-instruct format
        system_message = "You are an expert invoice data extraction assistant. Extract structured data from OCR text and return only valid JSON."
        
        user_message = f"""Extract invoice fields from this OCR text as JSON:

OCR Text:
{truncated_text}

Return JSON in this exact format:
{{
  "vendor_name": "company name with legal suffix (S.R.L., B.V., Ltd, etc)",
  "description": "main service/product description", 
  "total_amount": 25.00,
  "net_amount": 20.66,
  "vat_amount": 4.34,
  "vat_rate": 0.21,
  "date": "2025-01-15",
  "reverse_charge": false,
  "currency": "EUR"
}}

Rules:
- Extract ALL three amounts: total_amount (incl VAT), net_amount (excl VAT), vat_amount
- VAT rate: 21% = 0.21, reverse charge = 0
- European format: "25,00" = 25.00, "600,00" = 600.00  
- Reverse charge if text contains "reverse charge", "reverse taxation", or "btw verlegd"
- Date format: convert to YYYY-MM-DD

Return ONLY the JSON object, no other text."""

        # Try multiple endpoints for WSL2/Windows compatibility
        for endpoint in self.llm_config['endpoints']:
            try:
                print(f"Attempting LLM connection to: {endpoint}", file=sys.stderr)
                
                # Call Phi-3.5-mini via LM Studio chat completions API with proper format
                response = requests.post(
                    f"{endpoint}/chat/completions",
                    json={
                        "model": self.llm_config['model'],
                        "messages": [
                            {"role": "system", "content": system_message},
                            {"role": "user", "content": user_message}
                        ],
                        "max_tokens": 600,
                        "temperature": 0.01,  # Very low for consistency
                        "top_p": 0.95
                    },
                    timeout=self.llm_config['timeout']
                )
                
                if response.status_code == 200:
                    result_text = response.json()["choices"][0]["message"]["content"]
                    print(f"Raw LLM response from {endpoint}: {repr(result_text)}", file=sys.stderr)
                    
                    # Clean and fix JSON response
                    result_text = result_text.strip()
                    
                    # Extract JSON from verbose LLM response  
                    json_candidates = []
                    
                    # Find all potential JSON objects in the response
                    start_idx = 0
                    while True:
                        start = result_text.find('{', start_idx)
                        if start == -1:
                            break
                            
                        # Find matching closing brace
                        brace_count = 0
                        json_end = 0
                        for i in range(start, len(result_text)):
                            char = result_text[i]
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    json_end = i + 1
                                    break
                        
                        if json_end > 0:
                            json_candidate = result_text[start:json_end]
                            json_candidates.append(json_candidate)
                            start_idx = json_end
                        else:
                            break
                    
                    # Try to parse each JSON candidate
                    for i, json_candidate in enumerate(json_candidates):
                        try:
                            # Clean the JSON candidate
                            lines = json_candidate.split('\n')
                            clean_lines = []
                            for line in lines:
                                # Remove comments
                                if '//' in line:
                                    line = line[:line.find('//')]
                                # Remove markdown code block markers
                                line = line.replace('```json', '').replace('```', '')
                                clean_lines.append(line)
                            
                            json_clean = '\n'.join(clean_lines).strip()
                            
                            # Try to parse
                            parsed = json.loads(json_clean)
                            
                            # Validate it has required fields for invoice data
                            if (isinstance(parsed, dict) and 
                                'vendor_name' in parsed and 
                                ('total_amount' in parsed or 'amount' in parsed)):
                                
                                print(f"Successfully parsed JSON candidate {i+1}/{len(json_candidates)} from {endpoint}", file=sys.stderr)
                                print(f"LLM extraction successful via {endpoint}: {parsed.get('vendor_name', 'Unknown vendor')}", file=sys.stderr)
                                return parsed
                            else:
                                print(f"JSON candidate {i+1} missing required fields", file=sys.stderr)
                                
                        except json.JSONDecodeError as e:
                            print(f"Failed to parse JSON candidate {i+1}: {e}", file=sys.stderr)
                            continue
                    
                    print(f"No valid JSON found in response from {endpoint} (tried {len(json_candidates)} candidates)", file=sys.stderr)
                    continue
                else:
                    print(f"LLM API error from {endpoint}: {response.status_code} - {response.text}", file=sys.stderr)
                    continue  # Try next endpoint
                    
            except requests.exceptions.RequestException as e:
                print(f"LLM connection failed to {endpoint}: {e}", file=sys.stderr)
                continue  # Try next endpoint
            except json.JSONDecodeError as e:
                print(f"LLM returned invalid JSON from {endpoint}: {e}", file=sys.stderr)
                continue  # Try next endpoint
            except Exception as e:
                print(f"LLM extraction failed from {endpoint}: {e}", file=sys.stderr)
                continue  # Try next endpoint
        
        # If all endpoints failed
        print("All LLM endpoints failed, falling back to rule-based parsing", file=sys.stderr)
        return None

    def fallback_rule_parsing(self, text_lines: List[str]) -> dict:
        """Fallback to rule-based parsing if LLM fails"""
        print("Using rule-based fallback parsing", file=sys.stderr)
        
        vendor = self.parse_vendor(text_lines)
        amounts = self.parse_amounts(text_lines)
        receipt_date = self.parse_date(text_lines)
        description = self.parse_description(text_lines)
        
        # Check for reverse charge
        raw_text = ' '.join(text_lines)
        reverse_charge_detected = self.detect_reverse_charge_patterns(raw_text)
        
        # Determine VAT rate and amounts
        if reverse_charge_detected:
            # For reverse charge: net amount = total amount, VAT = 0
            vat_rate = 0.0
            vat_amount = 0.0
            net_amount = amounts['total_amount'] or amounts['net_amount']  # Use total as net for reverse charge
        else:
            # Standard VAT calculation
            vat_rate = 0.21  # Default
            if amounts['vat_amount'] and amounts['net_amount']:
                vat_rate = self.determine_vat_rate(amounts['vat_amount'], amounts['net_amount'])
            vat_amount = amounts['vat_amount']
            net_amount = amounts['net_amount']
            
        return {
            'vendor_name': vendor,
            'expense_date': receipt_date,
            'description': description,
            'amount': net_amount,
            'vat_amount': vat_amount,
            'vat_rate': vat_rate,
            'total_amount': amounts['total_amount'],
            'currency': 'EUR',
            'requires_manual_review': True,  # Mark as needing review since LLM failed
            'reverse_charge_detected_in_text': reverse_charge_detected,
            'suggested_vat_type': 'reverse_charge' if reverse_charge_detected else 'standard'
        }

    def categorize_expense(self, vendor_name: str, description: str = "") -> str:
        """Categorize expense based on vendor name and description using existing patterns"""
        vendor_lower = vendor_name.lower()
        description_lower = description.lower() if description else ""
        combined_text = f"{vendor_lower} {description_lower}"
        
        # Use official Belastingdienst categorization patterns
        for category, patterns in {
            'maaltijden_zakelijk': ['restaurant', 'cafe', 'bistro', 'eetcafe', 'mcdonalds', 'burger king', 'subway'],
            'reiskosten': ['ns ', 'gvb', 'uber', 'taxi', 'ov-chipkaart', 'train', 'bus'],
            'kantoorbenodigdheden': ['staples', 'office depot', 'supplies', 'kantoor'],
            'telefoon_communicatie': ['kpn', 'vodafone', 't-mobile', 'ziggo', 'telecom'],
            'professionele_diensten': ['consultant', 'advies', 'legal', 'accountant', 'development', 'design', 'it services', 'software', 'commission', 'comission', 'game development', 'programming', 'coding'],
            'software_ict': ['microsoft', 'adobe', 'software', 'saas', 'license'],
            'marketing_reclame': ['google ads', 'facebook', 'marketing', 'advertising', 'social media', 'sales commission', 'lead generation'],
            'afschrijvingen': ['apple', 'dell', 'hp', 'laptop', 'computer', 'equipment'],
            'verzekeringen': ['insurance', 'verzekering', 'asr', 'aegon']
        }.items():
            for pattern in patterns:
                if pattern in combined_text:
                    return category
        
        return 'overige_zakelijk'

    def apply_business_logic(self, llm_fields: dict, raw_text: str, vies_results: List[Dict] = None) -> dict:
        """Apply VIES-first business logic for reverse charge determination"""
        
        # Basic expense categorization
        vendor_name = llm_fields.get('vendor_name', '')
        description = llm_fields.get('description', '')
        expense_type = self.categorize_expense(vendor_name, description) if vendor_name else 'overige_zakelijk'
        
        # VIES-First Decision Tree for Reverse Charge
        vat_decision = self._determine_vat_treatment(vies_results)
        
        result = {
            'expense_type': expense_type,
            'suggested_vat_type': vat_decision['vat_type'],
            'suggested_vat_rate': vat_decision['vat_rate'],
            'suggested_payment_method': 'bank_transfer',
            'vat_validation_status': vat_decision['status'],
            'vat_validation_message': vat_decision['message'],
            'requires_manual_review': vat_decision['requires_review']
        }
        
        # Add validated supplier information if available
        if vat_decision['validated_supplier']:
            result['validated_supplier'] = vat_decision['validated_supplier']
        
        # Keep legacy fields for backward compatibility
        result['reverse_charge_detected_in_text'] = self.detect_reverse_charge_patterns(raw_text)
        result['reverse_charge_detected_from_vat'] = vat_decision['vat_type'] == 'reverse_charge'
        
        return result
    
    def _determine_vat_treatment(self, vies_results: List[Dict] = None) -> dict:
        """VIES-first decision tree for VAT treatment determination"""
        
        if not vies_results:
            return {
                'vat_type': 'standard',
                'vat_rate': 0.21,
                'status': 'no_vat_found',
                'message': 'Geen BTW nummer gevonden in factuur',
                'requires_review': True,
                'validated_supplier': None
            }
        
        # Check for valid VAT numbers
        valid_vat_numbers = [vat for vat in vies_results if vat.get('valid') == True]
        invalid_vat_numbers = [vat for vat in vies_results if vat.get('valid') == False]
        unknown_vat_numbers = [vat for vat in vies_results if vat.get('valid') is None]
        
        # Priority 1: Valid non-NL EU VAT number = Reverse charge required
        for vat_result in valid_vat_numbers:
            country_code = vat_result.get('country_code', '').upper()
            if country_code and country_code != 'NL':
                return {
                    'vat_type': 'reverse_charge',
                    'vat_rate': -1,  # -1 indicates reverse charge
                    'status': 'valid_eu_vat',
                    'message': f'Geldig {country_code} BTW nummer - BTW verlegd van toepassing',
                    'requires_review': False,
                    'validated_supplier': {
                        'vat_number': vat_result.get('vat_number'),
                        'country_code': country_code,
                        'company_name': vat_result.get('company_name'),
                        'company_address': vat_result.get('company_address'),
                        'vies_validation_date': vat_result.get('validation_date')
                    }
                }
        
        # Priority 2: Valid NL VAT number = Standard Dutch VAT
        for vat_result in valid_vat_numbers:
            country_code = vat_result.get('country_code', '').upper()
            if country_code == 'NL':
                return {
                    'vat_type': 'standard',
                    'vat_rate': 0.21,
                    'status': 'valid_nl_vat',
                    'message': f'Geldig Nederlands BTW nummer - Standaard 21% BTW',
                    'requires_review': False,
                    'validated_supplier': {
                        'vat_number': vat_result.get('vat_number'),
                        'country_code': country_code,
                        'company_name': vat_result.get('company_name'),
                        'company_address': vat_result.get('company_address'),
                        'vies_validation_date': vat_result.get('validation_date')
                    }
                }
        
        # Priority 3: Invalid VAT numbers found = Warning + 21% BTW
        if invalid_vat_numbers:
            invalid_numbers = ', '.join([vat.get('vat_number', '') for vat in invalid_vat_numbers])
            return {
                'vat_type': 'standard',
                'vat_rate': 0.21,
                'status': 'invalid_vat',
                'message': f'Ongeldig BTW nummer gevonden: {invalid_numbers} - Controleer leverancier gegevens',
                'requires_review': True,
                'validated_supplier': None
            }
        
        # Priority 4: Unknown VAT numbers (rate limited/errors) - check if EU country for reverse charge
        if unknown_vat_numbers:
            unknown_numbers = ', '.join([vat.get('vat_number', '') for vat in unknown_vat_numbers])
            
            # Check if any unknown VAT numbers are from non-NL EU countries
            for vat_result in unknown_vat_numbers:
                country_code = vat_result.get('country_code', '').upper()
                if country_code and country_code != 'NL' and self._is_eu_country(country_code):
                    return {
                        'vat_type': 'reverse_charge',
                        'vat_rate': -1,
                        'status': 'vat_validation_failed_but_eu',
                        'message': f'BTW nummer validatie mislukt voor {country_code} - maar EU land gedetecteerd, BTW verlegd toegepast',
                        'requires_review': True,
                        'validated_supplier': {
                            'vat_number': vat_result.get('vat_number'),
                            'country_code': country_code,
                            'company_name': None,
                            'company_address': None,
                            'vies_validation_date': None
                        }
                    }
            
            return {
                'vat_type': 'standard',
                'vat_rate': 0.21,
                'status': 'vat_validation_failed',
                'message': f'BTW nummer validatie mislukt: {unknown_numbers} - Handmatige controle vereist',
                'requires_review': True,
                'validated_supplier': None
            }
        
        # Fallback: No VAT numbers processed
        return {
            'vat_type': 'standard',
            'vat_rate': 0.21,
            'status': 'no_vat_found',
            'message': 'Geen BTW nummer gevonden in factuur',
            'requires_review': True,
            'validated_supplier': None
        }
        
    def detect_reverse_charge_patterns(self, text: str) -> bool:
        """Detect reverse charge patterns in text as fallback"""
        if not text:
            return False
            
        text_lower = text.lower()
        patterns = [
            'reverse charge', 'reverse taxation', 'reverse vat',
            'btw verlegd', 'verlegde btw', 'btw verlegging'
        ]
        
        return any(pattern in text_lower for pattern in patterns)

    def extract_vat_numbers(self, text: str) -> List[Dict[str, str]]:
        """Extract VAT numbers from OCR text with country detection"""
        if not text:
            return []
        
        vat_numbers = []
        
        # EU VAT number patterns - comprehensive coverage
        vat_patterns = {
            'NL': r'\b(?:NL\s?)?(\d{9}B\d{2})\b',  # Netherlands: NL123456789B01
            'DE': r'\b(?:DE\s?)?(\d{9})\b',        # Germany: DE123456789  
            'FR': r'\b(?:FR\s?)?\d{2}\s?(\d{9})\b', # France: FR12 123456789
            'BE': r'\b(?:BE\s?)?(\d{10})\b',       # Belgium: BE0123456789
            'RO': r'\b(?:RO\s?)?(\d{2,10})\b',     # Romania: RO12345678
            'IT': r'\b(?:IT\s?)?(\d{11})\b',       # Italy: IT12345678901
            'ES': r'\b(?:ES\s?)?\d{1}\d{7}[\dA-Z]\b', # Spain: ES12345678Z
            'PL': r'\b(?:PL\s?)?(\d{10})\b',       # Poland: PL1234567890
            'CZ': r'\b(?:CZ\s?)?(\d{8,10})\b',     # Czech Republic: CZ12345678
            'AT': r'\b(?:AT\s?)?(U\d{8})\b',       # Austria: ATU12345678
        }
        
        # Additional patterns for common formats
        generic_patterns = [
            r'\b([A-Z]{2}\d{8,12}[A-Z]?\d{0,3})\b',  # Generic EU format
            r'\btax\s+(?:code|id|number)[:,\s]*([A-Z]{2}?\s?\d{8,12}[A-Z]?\d{0,3})\b',
            r'\bvat\s+(?:number|id)[:,\s]*([A-Z]{2}?\s?\d{8,12}[A-Z]?\d{0,3})\b',
            r'\bbtw\s+(?:nummer|number)[:,\s]*([A-Z]{2}?\s?\d{8,12}[A-Z]?\d{0,3})\b',
            r'\bcif[:,\s]*([A-Z]{2}?\s?\d{8,12}[A-Z]?\d{0,3})\b',
        ]
        
        text_lines = text.split('\n')
        
        # Search each line for VAT numbers
        for line_num, line in enumerate(text_lines):
            line = line.strip().upper()
            if not line:
                continue
                
            # Try country-specific patterns first
            for country_code, pattern in vat_patterns.items():
                matches = re.findall(pattern, line, re.IGNORECASE)
                for match in matches:
                    clean_vat = re.sub(r'[^\dA-Z]', '', match.upper())
                    if len(clean_vat) >= 8:  # Minimum length check
                        vat_numbers.append({
                            'vat_number': f"{country_code}{clean_vat}",
                            'country_code': country_code,
                            'raw_match': match,
                            'line_context': line,
                            'line_number': line_num + 1,
                            'extraction_method': 'country_pattern'
                        })
            
            # Try generic patterns as fallback
            for pattern in generic_patterns:
                matches = re.findall(pattern, line, re.IGNORECASE)
                for match in matches:
                    clean_match = re.sub(r'[^\dA-Z]', '', match.upper())
                    if len(clean_match) >= 8:
                        # Try to detect country from prefix
                        country_code = None
                        if clean_match[:2].isalpha():
                            country_code = clean_match[:2]
                            vat_number = clean_match
                        else:
                            # No country prefix, try to infer from context
                            vat_number = clean_match
                            country_code = self._infer_country_from_context(line, text_lines[max(0, line_num-2):line_num+3])
                        
                        if country_code:
                            vat_numbers.append({
                                'vat_number': vat_number,
                                'country_code': country_code,
                                'raw_match': match,
                                'line_context': line,
                                'line_number': line_num + 1,
                                'extraction_method': 'generic_pattern'
                            })
        
        # Remove duplicates while preserving order
        seen = set()
        unique_vat_numbers = []
        for vat in vat_numbers:
            vat_key = vat['vat_number']
            if vat_key not in seen:
                seen.add(vat_key)
                unique_vat_numbers.append(vat)
        
        return unique_vat_numbers

    def _infer_country_from_context(self, line: str, context_lines: List[str]) -> Optional[str]:
        """Infer country code from surrounding context"""
        all_text = ' '.join(context_lines).upper()
        
        # Country indicators
        country_indicators = {
            'NL': ['NETHERLANDS', 'NEDERLAND', 'HOLLAND', 'DUTCH'],
            'DE': ['GERMANY', 'DEUTSCHLAND', 'GERMAN'],
            'FR': ['FRANCE', 'FRENCH', 'FRANCAIS'],
            'BE': ['BELGIUM', 'BELGIE', 'BELGIQUE'],
            'RO': ['ROMANIA', 'ROMANIAN', 'BUCURESTI', 'BUCHAREST'],
            'IT': ['ITALY', 'ITALIA', 'ITALIAN'],
            'ES': ['SPAIN', 'ESPANA', 'SPANISH'],
            'PL': ['POLAND', 'POLSKA', 'POLISH'],
            'CZ': ['CZECH', 'CESKA', 'PRAGUE', 'PRAHA'],
            'AT': ['AUSTRIA', 'ÖSTERREICH', 'AUSTRIAN', 'VIENNA'],
        }
        
        for country_code, indicators in country_indicators.items():
            if any(indicator in all_text for indicator in indicators):
                return country_code
        
        return None

    def _is_eu_country(self, country_code: str) -> bool:
        """Check if country code is an EU member state"""
        eu_countries = {
            'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 
            'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 
            'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
        }
        return country_code.upper() in eu_countries

    def _filter_relevant_vat_numbers(self, vat_numbers: List[Dict]) -> List[Dict]:
        """Filter VAT numbers to find the most relevant ones for validation"""
        if not vat_numbers:
            return []
        
        # Priority scoring system
        scored_vats = []
        
        for vat in vat_numbers:
            score = 0
            context = vat['line_context'].upper()
            vat_num = vat['vat_number']
            
            # High priority: Explicit VAT/TAX labels
            if any(label in context for label in ['TAX CODE', 'VAT NUMBER', 'BTW NUMMER', 'SPECIAL TAX CODE']):
                score += 50
            
            # Medium priority: Line contains clear VAT indicators  
            if any(indicator in context for indicator in ['TAX', 'VAT', 'BTW', 'CIF']):
                score += 30
            
            # Country-specific scoring
            country = vat['country_code']
            if country == 'NL':
                score += 20  # Dutch VAT numbers are always relevant
            elif country == 'RO' and 'ROMANIA' in vat.get('extraction_context', ''):
                score += 25  # Romanian context makes RO VAT more likely
                
            # Length-based scoring (proper VAT numbers have specific lengths)
            vat_digits = re.sub(r'[^\d]', '', vat_num)
            if country == 'NL' and len(vat_digits) == 9:
                score += 15
            elif country == 'RO' and len(vat_digits) in [8, 9, 10]:
                score += 15
            
            # Penalty for duplicate patterns (same number, different country)
            base_number = re.sub(r'^[A-Z]{2}', '', vat_num)
            duplicate_penalty = sum(1 for other in vat_numbers 
                                  if other != vat and base_number in other['vat_number'])
            score -= duplicate_penalty * 10
            
            scored_vats.append((score, vat))
        
        # Sort by score (highest first) and return top candidates
        scored_vats.sort(reverse=True, key=lambda x: x[0])
        
        # Remove very low scoring entries (likely false positives)
        filtered = [vat for score, vat in scored_vats if score >= 20]
        
        # Deduplicate by VAT number (keep highest scoring)
        seen_numbers = set()
        unique_vats = []
        for score, vat in scored_vats:
            vat_num = vat['vat_number']
            if vat_num not in seen_numbers and score >= 20:
                seen_numbers.add(vat_num)
                unique_vats.append(vat)
        
        return unique_vats

    def validate_vat_with_vies(self, vat_number: str, country_code: str) -> Optional[Dict]:
        """Validate VAT number using VIES API with rate limiting consideration"""
        try:
            # Remove country code from VAT number for VIES API
            vat_number_only = re.sub(f'^{country_code}', '', vat_number, flags=re.IGNORECASE)
            
            print(f"VIES validation: {country_code}{vat_number_only}", file=sys.stderr)
            
            # Use the official VIES REST API
            vies_url = f"https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{country_code}/vat/{vat_number_only}"
            
            response = requests.get(vies_url, 
                headers={
                    'Accept': 'application/json',
                    'User-Agent': 'Dutch-ZZP-Financial-Suite/1.0'
                },
                timeout=8  # Shorter timeout for background validation
            )

            if response.status_code == 200:
                data = response.json()
                user_error = data.get('userError', '')
                
                print(f"VIES response for {country_code}{vat_number_only}: valid={data.get('isValid', False)}, error={user_error}", file=sys.stderr)
                
                # Handle rate limiting gracefully
                if user_error == 'MS_MAX_CONCURRENT_REQ':
                    return {
                        'vat_number': vat_number,
                        'country_code': country_code,
                        'valid': None,  # Unknown due to rate limiting
                        'error': 'VIES API rate limit reached',
                        'validation_date': data.get('requestDate')
                    }
                
                return {
                    'vat_number': vat_number,
                    'country_code': country_code,
                    'valid': data.get('isValid', False) == True,
                    'company_name': data.get('name'),
                    'company_address': data.get('address'),
                    'validation_date': data.get('requestDate'),
                    'user_error': user_error,
                    'request_id': data.get('requestIdentifier')
                }
            else:
                print(f"VIES API error: {response.status_code} for {country_code}{vat_number_only}", file=sys.stderr)
                return None
                
        except Exception as e:
            print(f"VIES validation error for {country_code}{vat_number}: {e}", file=sys.stderr)
            return None

    def process_receipt(self, image_path: str) -> Dict:
        """Process receipt with LLM-enhanced field extraction"""
        try:
            # Stage 1: OCR text extraction (keep current PaddleOCR)
            ocr_results = self.extract_text(image_path)
            if not ocr_results:
                return {
                    'success': False,
                    'error': 'No text could be extracted from image',
                    'confidence': 0.0
                }
            
            # Get text lines and overall confidence
            text_lines = [result[0] for result in ocr_results]
            avg_confidence = sum(result[1] for result in ocr_results) / len(ocr_results)
            raw_text = '\n'.join(text_lines)
            
            # Stage 2: LLM field extraction
            llm_fields = self.extract_fields_with_llm(raw_text)
            
            # Stage 3: VAT number extraction and VIES validation
            extracted_vat_numbers = self.extract_vat_numbers(raw_text)
            vies_validation_results = []
            
            # Filter and validate only the most relevant VAT numbers
            filtered_vat_numbers = self._filter_relevant_vat_numbers(extracted_vat_numbers)
            
            # Validate filtered VAT numbers (max 2 to respect VIES rate limits)
            for vat_info in filtered_vat_numbers[:2]:
                vies_result = self.validate_vat_with_vies(vat_info['vat_number'], vat_info['country_code'])
                if vies_result:
                    vies_result.update({
                        'extraction_context': vat_info['line_context'],
                        'line_number': vat_info['line_number'],
                        'extraction_method': vat_info['extraction_method']
                    })
                    vies_validation_results.append(vies_result)
            
            if llm_fields:
                # Use LLM extraction results
                extracted_data = {
                    'vendor_name': llm_fields.get('vendor_name'),
                    'expense_date': llm_fields.get('date'),
                    'description': llm_fields.get('description'),
                    'amount': llm_fields.get('net_amount'),
                    'vat_amount': llm_fields.get('vat_amount'),
                    'vat_rate': llm_fields.get('vat_rate', 0.21),
                    'total_amount': llm_fields.get('total_amount'),
                    'currency': llm_fields.get('currency', 'EUR'),
                    'requires_manual_review': avg_confidence < 0.8
                }
                
                # Apply business logic with VIES validation results
                business_logic = self.apply_business_logic(llm_fields, raw_text, vies_validation_results)
                extracted_data.update(business_logic)
                
                extraction_method = 'llm'
                processing_engine = 'PaddleOCR + Phi-3.5-mini'
                
            else:
                # Fallback to rule-based parsing with VIES validation
                extracted_data = self.fallback_rule_parsing(text_lines)
                
                # Apply business logic even for fallback parsing to get VIES validation
                business_logic = self.apply_business_logic(extracted_data, raw_text, vies_validation_results)
                extracted_data.update(business_logic)
                
                extraction_method = 'rules'
                processing_engine = 'PaddleOCR + Rules'
                
            # Build result
            result = {
                'success': True,
                'confidence': round(avg_confidence, 2),
                'raw_text': raw_text,
                'extracted_data': extracted_data,
                'extraction_method': extraction_method,
                'ocr_metadata': {
                    'line_count': len(text_lines),
                    'processing_engine': processing_engine,
                    'language': 'nl/en',
                    'confidence_scores': [result[1] for result in ocr_results]
                }
            }
            
            # Add VAT validation results if any were found
            if extracted_vat_numbers:
                result['vat_numbers'] = {
                    'extracted': extracted_vat_numbers,
                    'vies_validation': vies_validation_results,
                    'validation_count': len(vies_validation_results),
                    'total_extracted': len(extracted_vat_numbers)
                }
            
            return result
            
        except Exception as e:
            import traceback
            print(f"Full processing error: {traceback.format_exc()}", file=sys.stderr)
            return {
                'success': False,
                'error': f'Processing failed: {str(e)}',
                'confidence': 0.0,
                'debug_info': {
                    'error_type': type(e).__name__,
                    'image_path': image_path,
                    'traceback': traceback.format_exc()
                }
            }

def main():
    """Main function to process image from command line"""
    if len(sys.argv) != 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python ocr_processor.py <image_path>'
        }))
        return
        
    image_path = sys.argv[1]
    
    # Check if file exists
    if not Path(image_path).exists():
        print(json.dumps({
            'success': False,
            'error': f'Image file not found: {image_path}'
        }))
        return
    
    # Process the receipt
    parser = DutchReceiptParser()
    result = parser.process_receipt(image_path)
    
    # Output as JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()