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
        
        # Common Dutch retailers and their patterns
        self.vendor_patterns = [
            r'albert\s*heijn',
            r'jumbo',
            r'lidl',
            r'aldi',
            r'ah\.nl',
            r'action',
            r'kruidvat',
            r'etos',
            r'mediamarkt',
            r'coolblue',
            r'bol\.com',
            r'amazon\.nl',
            r'shell',
            r'bp\s*station',
            r'total',
            r'esso',
        ]
        
        # Amount patterns (European format)
        self.amount_patterns = [
            r'totaal\s*€?\s*(\d+[,\.]\d{2})',
            r'total\s*€?\s*(\d+[,\.]\d{2})',
            r'te\s*betalen\s*€?\s*(\d+[,\.]\d{2})',
            r'subtotal\s*€?\s*(\d+[,\.]\d{2})',
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
        
        # Date patterns
        self.date_patterns = [
            r'(\d{2}[-/\.]\d{2}[-/\.]\d{4})',
            r'(\d{2}[-/\.]\d{2}[-/\.]\d{2})',
            r'(\d{4}[-/\.]\d{2}[-/\.]\d{2})',
        ]

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
        """Extract vendor/supplier name from receipt"""
        combined_text = ' '.join(text_lines).lower()
        
        # Check for known Dutch retailers
        for pattern in self.vendor_patterns:
            match = re.search(pattern, combined_text, re.IGNORECASE)
            if match:
                # Capitalize first letters for display
                vendor = match.group().replace('.', ' ').title()
                return vendor.strip()
                
        # If no known retailer found, try to extract from top lines
        for line in text_lines[:5]:  # Check first 5 lines
            line = line.strip()
            if len(line) > 3 and not re.search(r'\d', line):  # No digits, likely a name
                return line.title()
                
        return None

    def parse_amounts(self, text_lines: List[str]) -> Dict[str, Optional[float]]:
        """Extract amounts from receipt"""
        combined_text = ' '.join(text_lines).lower()
        amounts = {
            'total_amount': None,
            'vat_amount': None,
            'net_amount': None
        }
        
        # Find total amount
        for pattern in self.amount_patterns:
            matches = re.findall(pattern, combined_text, re.IGNORECASE)
            if matches:
                try:
                    # Convert European format to float
                    amount_str = matches[-1].replace(',', '.')  # Take last match (usually total)
                    amounts['total_amount'] = float(amount_str)
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
        """Extract date from receipt"""
        combined_text = ' '.join(text_lines)
        
        for pattern in self.date_patterns:
            match = re.search(pattern, combined_text)
            if match:
                date_str = match.group(1)
                # Normalize date format to YYYY-MM-DD
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