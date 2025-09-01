#!/usr/bin/env python3
"""
PaddleOCR Receipt Processing Script
Extracts text from receipt images and attempts to parse structured data
"""

import sys
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from paddleocr import PaddleOCR

class DutchReceiptParser:
    """Parse Dutch receipts and extract structured information"""
    
    def __init__(self):
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

    def process_receipt(self, image_path: str) -> Dict:
        """Process receipt image and extract structured data"""
        try:
            # Extract text using OCR
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
            
            # Parse structured information
            vendor = self.parse_vendor(text_lines)
            amounts = self.parse_amounts(text_lines)
            receipt_date = self.parse_date(text_lines)
            description = self.parse_description(text_lines)
            
            # Determine VAT rate
            vat_rate = 0.21  # Default
            if amounts['vat_amount'] and amounts['net_amount']:
                vat_rate = self.determine_vat_rate(amounts['vat_amount'], amounts['net_amount'])
            
            # Build result
            result = {
                'success': True,
                'confidence': round(avg_confidence, 2),
                'raw_text': '\n'.join(text_lines),
                'extracted_data': {
                    'vendor_name': vendor,
                    'expense_date': receipt_date,
                    'description': description,
                    'amount': amounts['net_amount'],
                    'vat_amount': amounts['vat_amount'],
                    'vat_rate': vat_rate,
                    'total_amount': amounts['total_amount'],
                    'currency': 'EUR',
                    'requires_manual_review': avg_confidence < 0.8 or not vendor or not amounts['total_amount']
                },
                'ocr_metadata': {
                    'line_count': len(text_lines),
                    'processing_engine': 'PaddleOCR',
                    'language': 'nl/en',
                    'confidence_scores': [result[1] for result in ocr_results]
                }
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