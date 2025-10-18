#!/usr/bin/env python3
"""
Analyze Referral Excel File
This script will help us understand the structure of your referral file
and identify the correct column names for achievement percentage.
"""

import pandas as pd
import sys
import os

def analyze_referral_file(file_path):
    """Analyze the structure of a referral Excel file"""
    
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return
    
    try:
        print(f"Analyzing file: {file_path}")
        print("=" * 60)
        
        # Read the Excel file
        df = pd.read_excel(file_path)
        
        print(f"File shape: {df.shape}")
        print(f"Total rows: {df.shape[0]}")
        print(f"Total columns: {df.shape[1]}")
        print()
        
        print("All column names:")
        for i, col in enumerate(df.columns):
            print(f"  {i+1:2d}. '{col}'")
        print()
        
        # Look for achievement percentage related columns
        achievement_cols = []
        for col in df.columns:
            col_lower = str(col).lower()
            if any(keyword in col_lower for keyword in ['ach', 'achievement', '%', 'percent']):
                achievement_cols.append(col)
        
        print("Potential achievement/percentage columns:")
        if achievement_cols:
            for col in achievement_cols:
                print(f"  - '{col}'")
                # Show sample values
                sample_vals = df[col].dropna().head(5).tolist()
                print(f"    Sample values: {sample_vals}")
        else:
            print("  No obvious achievement/percentage columns found")
        print()
        
        # Show first few rows to understand structure
        print("First 5 rows of data:")
        print(df.head())
        print()
        
        # Check specific rows that might contain headers
        print("Checking different row positions for potential headers:")
        for row_idx in [0, 1, 2, 3]:
            if row_idx < len(df):
                print(f"Row {row_idx}: {df.iloc[row_idx].tolist()}")
        print()
        
        # Try the referral ETL processing logic
        print("Simulating referral ETL processing:")
        print("-" * 40)
        
        # Drop first column (like in ETL)
        df_no_first_col = df.iloc[:, 1:].copy()
        print(f"After dropping first column: {df_no_first_col.shape}")
        
        # Process headers (use row 1 as headers, start data from row 2)
        if len(df_no_first_col) > 2:
            new_df = df_no_first_col.iloc[2:].copy()
            new_df.columns = df_no_first_col.iloc[1]
            new_df = new_df.reset_index(drop=True)
            new_df.columns.name = None
            
            print(f"After ETL header processing: {new_df.shape}")
            print(f"New column names: {list(new_df.columns)}")
            
            # Look for achievement columns in processed data
            processed_achievement_cols = []
            for col in new_df.columns:
                col_lower = str(col).lower()
                if any(keyword in col_lower for keyword in ['ach', 'achievement', '%', 'percent', 'leads ach']):
                    processed_achievement_cols.append(col)
            
            print(f"Achievement columns after processing: {processed_achievement_cols}")
            
            # Test the find_candidates function logic
            def find_candidates(columns, keywords):
                results = []
                for c in columns:
                    cl = str(c).lower()
                    if any(k in cl for k in keywords):
                        results.append(c)
                return results
            
            ach_pct_cands = find_candidates(new_df.columns, [
                'leads ach%', 'ach%', 'achievement%', 'achievement', 'leads_ach%',
                'leads achievement%', 'lead ach%', 'lead achievement%',
                'referral ach%', 'referral achievement%', 'acheivement%',
                'ach %', 'leads ach %', 'lead ach %'
            ])
            
            print(f"Candidates found by ETL logic: {ach_pct_cands}")
            
            if ach_pct_cands:
                # Show sample data from the first candidate
                first_candidate = ach_pct_cands[0]
                print(f"Sample data from '{first_candidate}':")
                sample_data = new_df[first_candidate].dropna().head(10)
                print(sample_data.tolist())
        
    except Exception as e:
        print(f"Error analyzing file: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # List Excel files in current directory
    excel_files = [f for f in os.listdir('.') if f.endswith(('.xlsx', '.xls'))]
    
    print("Available Excel files in current directory:")
    for i, file in enumerate(excel_files):
        print(f"  {i+1}. {file}")
    
    if not excel_files:
        print("No Excel files found in current directory.")
        print("Please place your referral Excel file in the current directory and run again.")
        sys.exit(1)
    
    # Look for likely referral files
    referral_files = [f for f in excel_files if any(keyword in f.lower() for keyword in ['referral', 'ref', 'cm', 'team'])]
    
    if referral_files:
        print(f"\nLikely referral files found:")
        for f in referral_files:
            print(f"  - {f}")
        
        # Analyze the first likely referral file
        print(f"\nAnalyzing: {referral_files[0]}")
        analyze_referral_file(referral_files[0])
    else:
        print(f"\nNo obvious referral files found. Analyzing first Excel file: {excel_files[0]}")
        analyze_referral_file(excel_files[0])