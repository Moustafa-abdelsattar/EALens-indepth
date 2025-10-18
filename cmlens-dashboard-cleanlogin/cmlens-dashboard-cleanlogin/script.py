import pandas as pd
import re
import numpy as np
import json

def clean_numeric_value(value):
    """
    Clean numeric values that may contain symbols like >, <, >=, <=
    Examples: ">12" -> 12, "<5" -> 5, ">=10" -> 10, "15.5" -> 15.5
    """
    if pd.isna(value) or value is None:
        return None
    
    # Convert to string if not already
    str_value = str(value).strip()
    
    # If it's already a number, return it
    if isinstance(value, (int, float)) and not pd.isna(value):
        return float(value)
    
    # Remove common symbols and extract numeric part
    # Remove >, <, >=, <=, %, spaces, and other non-numeric characters except . and -
    cleaned = re.sub(r'[><≥≤%\s,]', '', str_value)
    
    # Try to extract number from the cleaned string
    number_match = re.search(r'-?\d+\.?\d*', cleaned)
    if number_match:
        try:
            return float(number_match.group())
        except ValueError:
            return None
    
    return None

def standardize_columns_for_frontend(df):
    """
    Standardize DataFrame columns to match frontend expectations
    """
    # Column mapping from current names to frontend expected names
    column_mapping = {
        # Agent identifier
        'Name': 'Name',
        'Agent_ID': 'Name', 
        'Agent': 'Name',
        
        # Team
        'Team': 'Team',
        'Team_Name': 'Team',
        
        # Group/Subgroup
        'Subgroup': 'Group',
        'Group': 'Group',
        'Group_Name': 'Group',
        
        # Students
        'Students': 'Students',
        'Student_Count': 'Students',
        
        # Percentages
        'Fixed_Pct': 'Fixed_Pct',
        'Fixed_Rate': 'Fixed_Pct',
        'CC%': 'CC_Pct',
        'Class_Consumption_Pct': 'CC_Pct',
        'SC%': 'SC_Pct', 
        'Super_Class_Consumption_Pct': 'SC_Pct',
        'UP%': 'UP_Pct',
        'Upgrade_Pct': 'UP_Pct',
        
        # Referrals
        'leads': 'Referral_Leads',
        'Referral_Leads': 'Referral_Leads',
        'Leads': 'Referral_Leads',
        'Show up': 'Referral_Showups',
        'Referral_Showups': 'Referral_Showups', 
        'Showups': 'Referral_Showups',
        'Paid': 'Referral_Paid',
        'Referral_Paid': 'Referral_Paid',
        'Leads_Ach_Pct': 'Referral_Ach_Pct',
        'Referral_Ach_Pct': 'Referral_Ach_Pct',
        
        # All Leads Report
        'Total_Leads': 'Total_Leads',
        'Recovered_Leads': 'Recovered_Leads',
        'Unrecovered_Leads': 'Unrecovered_Leads'
    }
    
    # Apply mappings for columns that exist
    new_df = df.copy()
    for old_name, new_name in column_mapping.items():
        if old_name in new_df.columns:
            new_df = new_df.rename(columns={old_name: new_name})
    
    # Ensure required columns exist with default values
    required_columns = {
        'Name': '',
        'Team': '',
        'Group': '',
        'Students': 0,
        'Fixed_Pct': None,
        'CC_Pct': None,
        'SC_Pct': None,
        'UP_Pct': None,
        'Referral_Leads': 0,
        'Referral_Showups': 0,
        'Referral_Paid': 0,
        'Referral_Ach_Pct': None,
        'Conversion_Rate': None,
        'Total_Leads': 0,
        'Recovered_Leads': 0,
        'Unrecovered_Leads': 0,
        'Unrecovered_Students': []
    }
    
    for col, default_val in required_columns.items():
        if col not in new_df.columns:
            if col == 'Unrecovered_Students':
                # Special handling for list column - create a list for each row
                new_df[col] = [[] for _ in range(len(new_df))]
            else:
                new_df[col] = default_val
    
    # Select only the required columns in the correct order
    final_columns = list(required_columns.keys())
    new_df = new_df[final_columns]
    
    return new_df

def dataframe_to_json_by_name(df, output_file=None):
    """
    Convert DataFrame to JSON format with Name as the key.
    
    Parameters:
    df (pandas.DataFrame): Input DataFrame with 'Name' column
    output_file (str, optional): Path to save JSON file. If None, returns JSON string.
    
    Returns:
    dict or str: JSON data as dictionary or string
    """
    if 'Name' not in df.columns:
        raise ValueError("DataFrame must contain a 'Name' column")
    
    # Convert DataFrame to dictionary with Name as key
    json_data = {}
    for index, row in df.iterrows():
        name = row['Name']
        # Convert the row to dict and remove the 'Name' key since it's now the main key
        row_dict = row.drop('Name').to_dict()
        
        # Convert numpy types to Python native types for JSON serialization
        for key, value in row_dict.items():
            if pd.isna(value):
                row_dict[key] = None
            elif isinstance(value, (np.integer, int)):
                row_dict[key] = int(value)
            elif isinstance(value, (np.floating, float)):
                row_dict[key] = float(value)
            elif isinstance(value, np.bool_):
                row_dict[key] = bool(value)
            elif isinstance(value, str):
                row_dict[key] = value
        
        json_data[name] = row_dict
    
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)
        print(f"JSON data saved to: {output_file}")
        return json_data
    else:
        return json_data

def normalize_name(name):
    """
    Normalize names for consistent matching: uppercase + strip whitespace
    Example: "EGLP-habdelaziz" and "EGLP-HABdelaziz" become "EGLP-HABDELAZIZ"
    """
    if pd.isna(name):
        return name
    return str(name).upper().strip()

def smart_fill_column(df, target_col, source_cols):
    """
    Fill target column using best available data from multiple sources
    """
    if target_col not in df.columns:
        df[target_col] = None
    
    for source in source_cols:
        if source in df.columns:
            # Fill missing values in target with non-null values from source
            mask = df[target_col].isna() & df[source].notna()
            df.loc[mask, target_col] = df.loc[mask, source]

def flexible_etl_pipeline(cc_file=None, up_file=None, re_file=None, fixed_file=None, all_leads_file=None, json_output=None):
    """
    Flexible ETL pipeline that can process any combination of the five data sources.
    
    Parameters:
    cc_file (str, optional): Path to CC Excel file (Class Consumption data)
    up_file (str, optional): Path to UP Excel file (Upgrade Rate data)
    re_file (str, optional): Path to RE Excel file (CM teams data)
    fixed_file (str, optional): Path to Fixed Rate Excel file
    all_leads_file (str, optional): Path to All Leads Report Excel file
    json_output (str, optional): Path to save JSON output file with Name as key
    
    Returns:
    pandas.DataFrame: Merged DataFrame with consistent structure regardless of input files
    
    Note: At least one file must be provided
    """
    
    # Validate input - at least one file must be provided
    if not any([cc_file, up_file, re_file, fixed_file, all_leads_file]):
        raise ValueError("At least one file must be provided")
    
    # Define the ETL functions inline for portability
    def cc_etl_internal(file_path):
        """CC ETL function - processes Class Consumption data"""
        df = pd.read_excel(file_path)
        
        # Transform - Remove first 3 rows and set 4th row as headers
        new_df = df.iloc[3:].copy()
        new_df.columns = df.iloc[3]
        new_df = new_df.iloc[1:].reset_index(drop=True)
        new_df.columns.name = None
        
        # Forward fill Team column
        team_col_name = new_df.columns[0]
        new_df[team_col_name] = new_df[team_col_name].ffill()
        
        # Process Subgroup column
        subgroup_col_name = new_df.columns[1]
        new_df = new_df.rename(columns={subgroup_col_name: 'Subgroup'})
        new_df['Subgroup'] = new_df['Subgroup'].ffill()
        
        # Remove '#' column if exists
        if '#' in new_df.columns:
            new_df = new_df.drop('#', axis=1)
        
        # Remove Total rows - comprehensive cleanup
        # First, remove any row where 'Name' column contains 'total' (case insensitive)
        if 'Name' in new_df.columns:
            mask = new_df['Name'].astype(str).str.lower().str.contains('total', na=False)
            new_df = new_df[~mask].reset_index(drop=True)
            print(f"Removed {mask.sum()} rows containing 'total' in Name column")
        
        # Remove rows where Name equals header values like 'Name'
        if 'Name' in new_df.columns:
            invalid_names = ['Name', 'NAME', 'name', 'Agent Name', 'CM Name', 'Last CM Name']
            mask = new_df['Name'].isin(invalid_names)
            removed_count = mask.sum()
            if removed_count > 0:
                new_df = new_df[~mask].reset_index(drop=True)
                print(f"Removed {removed_count} rows with invalid name headers")
        
        # Remove rows where any of the first 3 columns contain 'total'
        for col in new_df.columns[:3]:
            if col in new_df.columns:
                mask = new_df[col].astype(str).str.lower().str.contains('total', na=False)
                removed_count = mask.sum()
                if removed_count > 0:
                    new_df = new_df[~mask].reset_index(drop=True)
                    print(f"Removed {removed_count} rows containing 'total' in {col} column")
        
        # Remove rows where Name is exactly 'Total' (case insensitive)
        if 'Name' in new_df.columns:
            mask = new_df['Name'].astype(str).str.lower().str.strip() == 'total'
            removed_count = mask.sum()
            if removed_count > 0:
                new_df = new_df[~mask].reset_index(drop=True)
                print(f"Removed {removed_count} rows where Name is exactly 'Total'")
        
        # Remove rows where Name is NaN or empty after processing
        if 'Name' in new_df.columns:
            initial_count = len(new_df)
            new_df = new_df.dropna(subset=['Name']).reset_index(drop=True)
            new_df = new_df[new_df['Name'].astype(str).str.strip() != ''].reset_index(drop=True)
            removed_count = initial_count - len(new_df)
            if removed_count > 0:
                print(f"Removed {removed_count} rows with empty/NaN names")
        
        # Additional cleanup: Remove rows where team column contains only numbers (likely row numbers from Total sections)
        if team_col_name in new_df.columns:
            # Remove rows where team column is just a number (like row indices from Total sections)
            mask = new_df[team_col_name].astype(str).str.match(r'^\d+$', na=False)
            removed_count = mask.sum()
            if removed_count > 0:
                new_df = new_df[~mask].reset_index(drop=True)
                print(f"Removed {removed_count} rows with numeric team values")
            
            # Remove rows where team column is NaN or empty
            initial_count = len(new_df)
            new_df = new_df.dropna(subset=[team_col_name]).reset_index(drop=True)
            new_df = new_df[new_df[team_col_name].astype(str).str.strip() != ''].reset_index(drop=True)
            removed_count = initial_count - len(new_df)
            if removed_count > 0:
                print(f"Removed {removed_count} rows with empty/NaN team values")
        
        # Select required columns
        required_columns = [team_col_name, 'Subgroup', 'Name', 'M1-M4 Super_class_consumption', '>=12']
        available_columns = [col for col in required_columns if col in new_df.columns]
        new_df = new_df[available_columns]
        
        # Rename columns
        new_df.rename(columns={'M1-M4 Super_class_consumption':'SC%', '>=12':'CC%'}, inplace=True)
        
        # Clean percentage columns that may contain symbols like >, <
        for col in ['CC%', 'SC%']:
            if col in new_df.columns:
                new_df[col] = new_df[col].apply(clean_numeric_value)
        
        return new_df
    
    # Process available files
    processed_dfs = {}
    
    def up_etl_internal(file_path):
        """UP ETL function - processes Upgrade Rate data"""
        df = pd.read_excel(file_path)
        
        # Remove first 2 rows
        new_df = df.iloc[2:].copy()
        new_df = new_df.reset_index(drop=True)
        
        # Drop CM workplace columns
        workplace_cols = [col for col in new_df.columns if 'workplace' in col.lower() or 'CM workplace' in str(col)]
        if workplace_cols:
            new_df = new_df.drop(workplace_cols, axis=1)
        
        # Rename columns
        rename_map = {}
        for col in new_df.columns:
            if 'Last CM Name' in str(col):
                rename_map[col] = 'Name'
            elif 'Last CM Team' in str(col):
                rename_map[col] = 'Subgroup'
        new_df = new_df.rename(columns=rename_map)
        
        # Find upgrade rate column
        upgrade_rate_col = None
        for col in new_df.columns:
            if 'M-2累积升舱率' in str(col) or 'M-2 Cumulative Upgrade Rate' in str(col):
                upgrade_rate_col = col
                break
        
        # Select required columns
        required_columns = ['Name', 'Subgroup']
        if upgrade_rate_col:
            required_columns.append(upgrade_rate_col)
        
        available_columns = [col for col in required_columns if col in new_df.columns]
        new_df = new_df[available_columns]
        
        # Rename upgrade rate column
        if upgrade_rate_col and upgrade_rate_col in new_df.columns:
            new_df = new_df.rename(columns={upgrade_rate_col: 'UP%'})
            # Clean UP% column that may contain symbols like >, <
            new_df['UP%'] = new_df['UP%'].apply(clean_numeric_value)
        
        # Filter out rows where Name equals 'Sub Total' or '-'
        if 'Name' in new_df.columns:
            # Filter out invalid entries including headers, sub totals, and placeholders
            invalid_names = ['Sub Total', '-', 'NAME', 'Name', 'Last CM Name', 'CM Name', 'Agent Name']
            new_df = new_df[~new_df['Name'].isin(invalid_names)]
            new_df = new_df[new_df['Name'].notna()]  # Also remove NaN values
            # Filter out rows where Name starts with header-like patterns
            new_df = new_df[~new_df['Name'].astype(str).str.lower().str.match(r'^(total|sum|average|mean|header|column)', na=False)]
            new_df = new_df.reset_index(drop=True)
        
        return new_df
    
    def re_etl_internal(file_path):
        """RE ETL function - processes CM teams data"""
        df = pd.read_excel(file_path)
        
        # Drop first column
        df_no_first_col = df.iloc[:, 1:].copy()
        
        # Process headers
        new_df = df_no_first_col.iloc[2:].copy()
        new_df.columns = df_no_first_col.iloc[1]
        new_df = new_df.reset_index(drop=True)
        new_df.columns.name = None
        
        # Forward fill Team column
        team_col_name = new_df.columns[0]
        new_df[team_col_name] = new_df[team_col_name].ffill()
        
        # Process CM Name column
        cm_name_col = None
        for col in new_df.columns:
            if 'CM Name' in str(col) or 'CM name' in str(col):
                cm_name_col = col
                break
        if cm_name_col is None:
            for col in new_df.columns:
                if re.search(r'cm\s*name', str(col), flags=re.IGNORECASE):
                    cm_name_col = col
                    break
        
        if cm_name_col:
            new_df = new_df.dropna(subset=[cm_name_col]).reset_index(drop=True)
            new_df = new_df.rename(columns={cm_name_col: 'Name'})
        
        # Helper functions for column selection
        def find_candidates(columns, keywords):
            results = []
            for c in columns:
                cl = str(c).lower()
                if any(k in cl for k in keywords):
                    results.append(c)
            return results
        
        pct_tokens = ['%', 'rate', 'ratio', 'conversion', '转化', '率', '比例']
        def exclude_pct_named(cols):
            filtered = []
            for c in cols:
                cl = str(c).lower()
                if any(tok in cl for tok in pct_tokens):
                    continue
                filtered.append(c)
            return filtered
        
        def count_score(series):
            s = pd.to_numeric(series, errors='coerce').dropna()
            if len(s) == 0:
                return -1
            frac_gt1 = (s > 1).mean()
            frac_int_like = (abs(s - s.round()) < 1e-9).mean() if len(s) > 0 else 0
            frac_0_1 = ((s >= 0) & (s <= 1)).mean()
            return frac_gt1 + 0.5 * frac_int_like - frac_0_1
        
        def pick_count_col(df_in, candidates):
            if not candidates:
                return None
            named = exclude_pct_named(candidates)
            cand = named if named else candidates
            best_col = None
            best_score = -999
            for c in cand:
                score = count_score(df_in[c])
                if score > best_score:
                    best_score = score
                    best_col = c
            return best_col
        
        # Find metric columns
        leads_cands = find_candidates(new_df.columns, ['leads'])
        showup_cands = find_candidates(new_df.columns, ['show up', 'showup', 'show-up', 'show_up'])
        paid_cands = find_candidates(new_df.columns, ['paid'])
        # Add achievement percentage column search with more variations
        print(f"Searching for achievement percentage columns in: {list(new_df.columns)}")
        ach_pct_cands = find_candidates(new_df.columns, [
            'leads ach%', 'ach%', 'achievement%', 'achievement', 'leads_ach%',
            'leads achievement%', 'lead ach%', 'lead achievement%',
            'referral ach%', 'referral achievement%', 'acheivement%',
            'ach %', 'leads ach %', 'lead ach %'
        ])
        print(f"Achievement percentage candidates found: {ach_pct_cands}")
        
        leads_col = pick_count_col(new_df, leads_cands)
        showup_col = pick_count_col(new_df, showup_cands)
        paid_col = pick_count_col(new_df, paid_cands)
        # Use different selection logic for percentage columns
        ach_pct_col = None
        if ach_pct_cands:
            # For percentage columns, prefer exact matches or ones with "%" in name
            pct_matches = [col for col in ach_pct_cands if '%' in col.lower()]
            ach_pct_col = pct_matches[0] if pct_matches else ach_pct_cands[0]
            print(f"Found achievement percentage column: '{ach_pct_col}' from candidates: {ach_pct_cands}")
        else:
            print(f"No achievement percentage column found. Available columns: {list(new_df.columns)}")
            print(f"Looking for patterns: leads ach%, ach%, achievement%, etc.")
        
        # Select and rename columns
        required = {'Subgroup': team_col_name, 'Name': 'Name'}
        if leads_col:
            required['leads'] = leads_col
        if showup_col:
            required['Show up'] = showup_col
        if paid_col:
            required['Paid'] = paid_col
        if ach_pct_col:
            required['Leads_Ach_Pct'] = ach_pct_col
        
        selected_cols = [col for col in required.values() if col in new_df.columns]
        rename_map = {v: k for k, v in required.items() if v in new_df.columns}
        new_df = new_df[selected_cols].rename(columns=rename_map)
        
        # Clean and convert numeric columns
        for col in ['leads', 'Show up', 'Paid']:
            if col in new_df.columns:
                new_df[col] = new_df[col].apply(clean_numeric_value)
        
        # Handle achievement percentage column
        if 'Leads_Ach_Pct' in new_df.columns:
            print(f"Found Leads_Ach_Pct column in referral data")
            print(f"Sample raw values before cleaning: {new_df['Leads_Ach_Pct'].head().tolist()}")
            new_df['Leads_Ach_Pct'] = new_df['Leads_Ach_Pct'].apply(clean_numeric_value)
            print(f"Sample values after cleaning: {new_df['Leads_Ach_Pct'].head().tolist()}")
            
            # Convert decimal values to percentages (multiply by 100)
            # Values like 0.67 should become 67.0
            non_null_mask = new_df['Leads_Ach_Pct'].notna()
            if non_null_mask.any():
                # Check if values are in decimal format (0-2 range suggests decimals)
                sample_values = new_df.loc[non_null_mask, 'Leads_Ach_Pct'].head()
                max_sample = sample_values.max() if len(sample_values) > 0 else 0
                if max_sample <= 2.0:  # Likely decimal format, convert to percentage
                    new_df.loc[non_null_mask, 'Leads_Ach_Pct'] = new_df.loc[non_null_mask, 'Leads_Ach_Pct'] * 100
                    print(f"Converted decimal values to percentages (multiplied by 100)")
                    print(f"Sample values after percentage conversion: {new_df['Leads_Ach_Pct'].head().tolist()}")
            
            # Check for non-null values
            non_null_count = new_df['Leads_Ach_Pct'].notna().sum()
            print(f"Non-null Leads_Ach_Pct values: {non_null_count}/{len(new_df)}")
            if non_null_count > 0:
                print(f"Sample non-null values: {new_df[new_df['Leads_Ach_Pct'].notna()]['Leads_Ach_Pct'].head().tolist()}")
        else:
            print(f"Leads_Ach_Pct column not found in dataframe after renaming")
            print(f"Available columns: {list(new_df.columns)}")
        
        # Filter for ME-EG subgroups
        if 'Subgroup' in new_df.columns:
            new_df = new_df[new_df['Subgroup'].astype(str).str.startswith('ME-EG', na=False)].reset_index(drop=True)
        
        return new_df
    
    def fixed_etl_internal(file_path):
        """Fixed ETL function - processes Fixed Rate data
        Groups by LP (agent name) and calculates fixed rate from 'Fixed or Not' column"""
        df = pd.read_excel(file_path)
        
        print(f"Fixed file shape: {df.shape}")
        print(f"Fixed file columns: {list(df.columns)}")
        
        # Check if this is the new format with LP and 'Fixed or Not' columns
        if 'LP' in df.columns and 'Fixed or Not' in df.columns:
            print("Processing Fixed file with LP grouping logic...")
            
            # Group by LP (agent name) and calculate fixed statistics
            grouped = df.groupby('LP').agg({
                'Fixed or Not': ['sum', 'count'],  # sum = total fixed, count = total students
                'LP Group': 'first'  # get group info
            }).reset_index()
            
            # Flatten column names
            grouped.columns = ['Name', 'Fixed_Count', 'Total_Students', 'Group']
            
            # Calculate Fixed Rate as percentage
            grouped['Fixed_Pct'] = (grouped['Fixed_Count'] / grouped['Total_Students'] * 100).round(2)
            
            # Rename Students column to match expected format
            grouped = grouped.rename(columns={'Total_Students': 'Students'})
            
            # Select final columns
            result_df = grouped[['Name', 'Group', 'Students', 'Fixed_Pct']].copy()
            
            print(f"Fixed rate calculation completed: {len(result_df)} agents processed")
            print(f"Sample data:\n{result_df.head()}")
            
            return result_df
            
        else:
            # Fallback to old logic for different file formats
            print("Using fallback processing for Fixed file...")
            
            if 'Name' in df.columns or 'Agent' in df.columns:
                name_col = 'Name' if 'Name' in df.columns else 'Agent'
                required_cols = [name_col]
                
                # Look for fixed percentage column
                fixed_cols = [col for col in df.columns if 'fixed' in col.lower() or 'rate' in col.lower()]
                if fixed_cols:
                    required_cols.append(fixed_cols[0])
                    df = df.rename(columns={fixed_cols[0]: 'Fixed_Pct'})
                    # Clean Fixed_Pct column that may contain symbols like >, <
                    df['Fixed_Pct'] = df['Fixed_Pct'].apply(clean_numeric_value)
                
                # Look for student count column
                student_cols = [col for col in df.columns if 'student' in col.lower() or 'count' in col.lower()]
                if student_cols:
                    required_cols.append(student_cols[0])
                    df = df.rename(columns={student_cols[0]: 'Students'})
                
                # Standardize name column
                if name_col != 'Name':
                    df = df.rename(columns={name_col: 'Name'})
                    required_cols[0] = 'Name'
                
                # Select available columns
                available_cols = [col for col in required_cols if col in df.columns]
                df = df[available_cols]
            
            return df
    
    def all_leads_etl_internal(file_path):
        """All Leads ETL function - processes All Leads Report data
        Extracts agent names from 'The last (current) name of the LP employee assigned' column
        and counts total leads per agent, plus calculates recovered/unrecovered based on LP last note time"""
        
        try:
            print(f"[ALL_LEADS] Starting processing of file: {file_path}")
            df = pd.read_excel(file_path)
            
            print(f"[ALL_LEADS] File loaded successfully - shape: {df.shape}")
            print(f"[ALL_LEADS] Columns found: {list(df.columns)}")
            
            # Find the LP employee assigned column
            target_column = None
            possible_names = [
                'The last (current) name of the LP employee assigned',
                'LP employee assigned',
                'LP employee',
                'Employee assigned',
                'Assigned LP',
                'LP name',
                'Agent name',
                'Agent'
            ]
            
            print(f"[ALL_LEADS] Looking for LP employee column...")
            
            # Look for exact match first
            for col in df.columns:
                if str(col).strip() in possible_names:
                    target_column = col
                    print(f"[ALL_LEADS] Found exact match: '{target_column}'")
                    break
            
            # If no exact match, look for partial matches
            if target_column is None:
                for col in df.columns:
                    col_str = str(col).lower().strip()
                    if ('lp' in col_str and ('employee' in col_str or 'assigned' in col_str)) or \
                       ('agent' in col_str and 'name' in col_str):
                        target_column = col
                        print(f"[ALL_LEADS] Found partial match: '{target_column}'")
                        break
            
            if target_column is None:
                print(f"[ALL_LEADS] WARNING: Could not find LP employee column. Available columns: {list(df.columns)}")
                # Return empty dataframe with expected structure
                return pd.DataFrame({
                    'Name': [], 
                    'Total_Leads': [], 
                    'Recovered_Leads': [], 
                    'Unrecovered_Leads': [],
                    'Unrecovered_Students': []
                })
            
            print(f"[ALL_LEADS] Found LP employee column: '{target_column}'")
            
            # Find the LP last note time column
            note_time_column = None
            possible_note_columns = [
                'LP last note time',
                'LP last note',
                'Last note time',
                'Note time',
                'LP note time'
            ]
            
            # Look for exact match first
            for col in df.columns:
                if str(col).strip() in possible_note_columns:
                    note_time_column = col
                    break
            
            # If no exact match, look for partial matches
            if note_time_column is None:
                for col in df.columns:
                    col_str = str(col).lower().strip()
                    if 'lp' in col_str and 'note' in col_str and 'time' in col_str:
                        note_time_column = col
                        break
            
            if note_time_column is None:
                print(f"[ALL_LEADS] WARNING: Could not find LP last note time column. Available columns: {list(df.columns)}")
                print("[ALL_LEADS] Will only calculate Total_Leads, Recovered and Unrecovered will be 0")
            else:
                print(f"[ALL_LEADS] Found LP last note time column: '{note_time_column}'")
            
            # Find Student ID column
            student_id_column = None
            possible_student_id_names = [
                'Student ID',
                'StudentID',
                'Student_ID',
                'ID',
                'Lead ID',
                'LeadID',
                'Lead_ID',
                'Student Id',
                'Student'
            ]
            
            # Look for exact match first
            for col in df.columns:
                if str(col).strip() in possible_student_id_names:
                    student_id_column = col
                    break
            
            # If no exact match, look for partial matches
            if student_id_column is None:
                for col in df.columns:
                    col_str = str(col).lower().strip()
                    if ('student' in col_str and 'id' in col_str) or \
                       ('lead' in col_str and 'id' in col_str) or \
                       col_str == 'id':
                        student_id_column = col
                        break
            
            if student_id_column is None:
                print(f"[ALL_LEADS] WARNING: Could not find Student ID column. Available columns: {list(df.columns)}")
                print("[ALL_LEADS] Student ID details will not be available for unrecovered leads")
            else:
                print(f"[ALL_LEADS] Found Student ID column: '{student_id_column}'")
            
            # Extract and process the data
            # Filter out rows where agent name is missing
            print(f"[ALL_LEADS] Filtering out rows with missing agent names...")
            df_clean = df[df[target_column].notna()].copy()
            print(f"[ALL_LEADS] After filtering: {len(df_clean)} rows remaining")
            
            # CAPITALIZE and normalize agent names
            print(f"[ALL_LEADS] Normalizing agent names...")
            df_clean['Agent_Name_Clean'] = df_clean[target_column].astype(str).str.strip()
            df_clean['Agent_Name_Clean'] = df_clean['Agent_Name_Clean'].str.upper()  # CAPITALIZE all values
            df_clean['Agent_Name_Clean'] = df_clean['Agent_Name_Clean'].apply(normalize_name)  # Apply existing normalization
            
            # Calculate recovery status if note time column exists
            if note_time_column is not None:
                print(f"[ALL_LEADS] Calculating recovery status...")
                # Import datetime modules
                from datetime import datetime, timedelta
                
                # Parse the LP last note time with specific format handling
                def parse_lp_note_time(time_str):
                    """Parse LP note time format: 2025-09-09 0:21:46"""
                    if pd.isna(time_str) or str(time_str).strip() == '':
                        return None
                    try:
                        time_str = str(time_str).strip()
                        # Handle the specific format: YYYY-MM-DD H:MM:SS
                        if ' ' in time_str:
                            date_part = time_str.split(' ')[0]  # Extract date part only
                            return datetime.strptime(date_part, '%Y-%m-%d')
                        else:
                            # Try parsing as date only
                            return datetime.strptime(time_str, '%Y-%m-%d')
                    except Exception as e:
                        print(f"[ALL_LEADS] Error parsing date '{time_str}': {e}")
                        return None
                
                df_clean['Note_Time_Parsed'] = df_clean[note_time_column].apply(parse_lp_note_time)
                
                # Get today's date
                today = datetime.now()
                cutoff_date = today - timedelta(days=14)
                
                print(f"[ALL_LEADS] Today's date: {today.strftime('%Y-%m-%d')}")
                print(f"[ALL_LEADS] Cutoff date (14 days ago): {cutoff_date.strftime('%Y-%m-%d')}")
                
                # Determine recovery status - within last 14 days
                df_clean['Is_Recovered'] = (df_clean['Note_Time_Parsed'] >= cutoff_date) & (df_clean['Note_Time_Parsed'].notna())
                
                # Debug: Show sample recovery data
                print("[ALL_LEADS] Sample recovery analysis:")
                sample_data = df_clean[['Agent_Name_Clean', note_time_column, 'Note_Time_Parsed', 'Is_Recovered']].head(10)
                print(sample_data)
            else:
                # If no note time column, all leads are considered unrecovered
                print(f"[ALL_LEADS] No note time column found, marking all leads as unrecovered")
                df_clean['Is_Recovered'] = False
            
            # Group by agent and calculate metrics
            print(f"[ALL_LEADS] Grouping by agent and calculating metrics...")
            agent_stats = df_clean.groupby('Agent_Name_Clean').agg({
                'Agent_Name_Clean': 'count',  # Total leads count
                'Is_Recovered': ['sum', lambda x: (~x).sum()]  # Recovered and unrecovered counts
            }).reset_index()
            
            # Flatten column names
            agent_stats.columns = ['Name', 'Total_Leads', 'Recovered_Leads', 'Unrecovered_Leads']
            
            # Collect unrecovered student details per agent if Student ID column exists
            unrecovered_details = {}
            if student_id_column is not None:
                print(f"[ALL_LEADS] Collecting unrecovered student details...")
                # Get unrecovered students for each agent
                unrecovered_students = df_clean[df_clean['Is_Recovered'] == False]
                
                for agent_name in agent_stats['Name']:
                    agent_unrecovered = unrecovered_students[unrecovered_students['Agent_Name_Clean'] == agent_name]
                    
                    if len(agent_unrecovered) > 0:
                        student_details = []
                        for _, row in agent_unrecovered.iterrows():
                            student_info = {
                                'studentId': str(row[student_id_column]) if pd.notna(row[student_id_column]) else 'N/A',
                                'noteTime': str(row[note_time_column]) if note_time_column and pd.notna(row[note_time_column]) else 'N/A'
                            }
                            student_details.append(student_info)
                        
                        unrecovered_details[agent_name] = student_details
                    else:
                        unrecovered_details[agent_name] = []
            
            print(f"[ALL_LEADS] All Leads processing completed: {len(agent_stats)} agents with leads data")
            print(f"[ALL_LEADS] Sample leads data:")
            print(agent_stats.head())
            
            # Show recovery summary
            total_leads = agent_stats['Total_Leads'].sum()
            total_recovered = agent_stats['Recovered_Leads'].sum()
            total_unrecovered = agent_stats['Unrecovered_Leads'].sum()
            print(f"[ALL_LEADS] Recovery Summary: {total_leads} total leads, {total_recovered} recovered, {total_unrecovered} unrecovered")
            
            # Add unrecovered details to agent_stats for easy access
            if student_id_column is not None:
                agent_stats['Unrecovered_Students'] = agent_stats['Name'].map(unrecovered_details)
                print(f"[ALL_LEADS] Added unrecovered student details for {len(unrecovered_details)} agents")
            else:
                agent_stats['Unrecovered_Students'] = agent_stats['Name'].apply(lambda x: [])

            print(f"[ALL_LEADS] Processing completed successfully")
            return agent_stats
            
        except Exception as e:
            print(f"[ALL_LEADS] ERROR: Exception in all_leads_etl_internal: {str(e)}")
            print(f"[ALL_LEADS] ERROR: Exception type: {type(e).__name__}")
            import traceback
            print(f"[ALL_LEADS] ERROR: Full traceback:")
            traceback.print_exc()
            # Return empty dataframe with expected structure
            return pd.DataFrame({
                'Name': [], 
                'Total_Leads': [], 
                'Recovered_Leads': [], 
                'Unrecovered_Leads': [], 
                'Unrecovered_Students': []
            })    # Process available files and normalize names
    processed_dfs = {}
    
    if cc_file:
        df = cc_etl_internal(cc_file)
        if 'Name' in df.columns:
            df['Name'] = df['Name'].apply(normalize_name)
        processed_dfs['cc'] = df
    
    if up_file:
        df = up_etl_internal(up_file)
        if 'Name' in df.columns:
            df['Name'] = df['Name'].apply(normalize_name)
        processed_dfs['up'] = df
    
    if re_file:
        df = re_etl_internal(re_file)
        if 'Name' in df.columns:
            df['Name'] = df['Name'].apply(normalize_name)
        processed_dfs['re'] = df
    
    if fixed_file:
        df = fixed_etl_internal(fixed_file)
        if 'Name' in df.columns:
            df['Name'] = df['Name'].apply(normalize_name)
        processed_dfs['fixed'] = df
    
    if all_leads_file:
        df = all_leads_etl_internal(all_leads_file)
        if 'Name' in df.columns:
            df['Name'] = df['Name'].apply(normalize_name)
        processed_dfs['all_leads'] = df

    # Create comprehensive base DataFrame with ALL unique names from ALL files
    # This ensures no one gets lost in the merging process
    all_names = set()
    for df_name, df in processed_dfs.items():
        if 'Name' in df.columns:
            names = df['Name'].dropna().unique()
            all_names.update(names)
    
    print(f"Found {len(all_names)} unique names across all files")
    
    # Create comprehensive base DataFrame
    base_df = pd.DataFrame({'Name': sorted(list(all_names))})
    merged_df = base_df.copy()
    
    print(f"Created comprehensive base with {len(merged_df)} agents")
    
    # Merge with all dataframes using OUTER JOIN for comprehensive data preservation
    for df_name, df in processed_dfs.items():
        print(f"Merging {df_name.upper()} data with {len(df)} records...")
        
        # Prepare merge columns with source-specific suffixes
        merge_cols = ['Name']
        df_copy = df.copy()
        
        if df_name == 'cc':
            merge_cols.extend(['CC%', 'SC%'])
            if 'Subgroup' in df_copy.columns:
                df_copy = df_copy.rename(columns={'Subgroup': 'Subgroup_cc'})
                merge_cols.append('Subgroup_cc')
            # Handle team column
            team_col_df = None
            for col in df_copy.columns:
                if col not in ['Name', 'CC%', 'SC%', 'Subgroup_cc']:
                    team_col_df = col
                    break
            if team_col_df:
                df_copy = df_copy.rename(columns={team_col_df: 'Team_cc'})
                merge_cols.append('Team_cc')
        
        elif df_name == 'up':
            merge_cols.extend(['UP%'])
            if 'Subgroup' in df_copy.columns:
                df_copy = df_copy.rename(columns={'Subgroup': 'Subgroup_up'})
                merge_cols.append('Subgroup_up')
        
        elif df_name == 're':
            # Rename team column
            team_col_re = None
            for col in df_copy.columns:
                if col not in ['Name', 'Subgroup', 'leads', 'Show up', 'Paid', 'Leads_Ach_Pct']:
                    team_col_re = col
                    break
            if team_col_re:
                df_copy = df_copy.rename(columns={team_col_re: 'Team_re'})
                merge_cols.extend(['leads', 'Show up', 'Paid', 'Leads_Ach_Pct', 'Team_re'])
            else:
                merge_cols.extend(['leads', 'Show up', 'Paid', 'Leads_Ach_Pct'])
            if 'Subgroup' in df_copy.columns:
                df_copy = df_copy.rename(columns={'Subgroup': 'Subgroup_re'})
                merge_cols.append('Subgroup_re')
        
        elif df_name == 'fixed':
            # Handle fixed rate data - specific columns from new Fixed ETL
            # Keep Group column as-is since it contains important LP grouping info
            fixed_cols = ['Fixed_Pct', 'Students', 'Group']
            for col in fixed_cols:
                if col in df_copy.columns:
                    merge_cols.append(col)
        
        elif df_name == 'all_leads':
            # Handle all leads data - total leads count per agent plus recovery status
            print(f"Processing {df_name} with columns: {list(df_copy.columns)}")
            leads_cols = ['Total_Leads', 'Recovered_Leads', 'Unrecovered_Leads', 'Unrecovered_Students']
            for col in leads_cols:
                if col in df_copy.columns:
                    merge_cols.append(col)
                    print(f"Added {col} to merge columns")

        # Perform OUTER merge to preserve all data
        available_merge_cols = [col for col in merge_cols if col in df_copy.columns]
        before_merge = len(merged_df)
        merged_df = pd.merge(merged_df, df_copy[available_merge_cols], on='Name', how='outer')
        after_merge = len(merged_df)
        print(f"After merging {df_name.upper()}: {after_merge} total records ({after_merge - before_merge} new)")
        print(f"Available columns after merge: {list(merged_df.columns)}")
    
    # Enhanced Team and Subgroup filling using smart_fill_column function
    print("\nFilling missing Team and Subgroup information...")
    
    # Fill Team column from all available sources
    team_sources = ['Team_cc', 'Team_re']
    available_team_sources = [col for col in team_sources if col in merged_df.columns]
    if available_team_sources:
        smart_fill_column(merged_df, 'Team', available_team_sources)
        # Drop the temporary source columns
        merged_df = merged_df.drop(available_team_sources, axis=1)
        team_filled = merged_df['Team'].notna().sum()
        print(f"Team information filled for {team_filled} agents")
    
    # Fill Subgroup column from all available sources
    subgroup_sources = ['Subgroup_cc', 'Subgroup_up', 'Subgroup_re']
    available_subgroup_sources = [col for col in subgroup_sources if col in merged_df.columns]
    if available_subgroup_sources:
        smart_fill_column(merged_df, 'Subgroup', available_subgroup_sources)
        # Drop the temporary source columns
        merged_df = merged_df.drop(available_subgroup_sources, axis=1)
        subgroup_filled = merged_df['Subgroup'].notna().sum()
        print(f"Subgroup information filled for {subgroup_filled} agents")
    
    # Reorder columns
    desired_order = ['Name', 'Subgroup', 'Team', 'CC%', 'SC%', 'UP%', 'leads', 'Show up', 'Paid']
    final_columns = [col for col in desired_order if col in merged_df.columns]
    remaining_cols = [col for col in merged_df.columns if col not in final_columns]
    final_columns.extend(remaining_cols)
    merged_df = merged_df[final_columns]
    
    # Multiply percentage columns by 100
    percentage_cols = ['CC%', 'SC%', 'UP%']
    for col in percentage_cols:
        if col in merged_df.columns:
            merged_df[col] = merged_df[col] * 100
    
    # Add tracking columns
    merged_df['has_CC_data'] = merged_df['CC%'].notna() if 'CC%' in merged_df.columns else False
    merged_df['has_UP_data'] = merged_df['UP%'].notna() if 'UP%' in merged_df.columns else False
    merged_df['has_RE_data'] = False
    if any(col in merged_df.columns for col in ['leads', 'Show up', 'Paid']):
        re_cols = [col for col in ['leads', 'Show up', 'Paid'] if col in merged_df.columns]
        merged_df['has_RE_data'] = merged_df[re_cols].notna().any(axis=1)
    
    # Standardize column names for frontend compatibility
    merged_df = standardize_columns_for_frontend(merged_df)
    
    # Calculate conversion rate (recovered/total leads) as percentage
    if 'Total_Leads' in merged_df.columns and 'Recovered_Leads' in merged_df.columns:
        merged_df['Conversion_Rate'] = merged_df.apply(
            lambda row: (row['Recovered_Leads'] / row['Total_Leads'] * 100) 
            if row['Total_Leads'] > 0 else None, axis=1
        )
        print(f"Conversion rate calculated for agents with Total_Leads > 0")
        # Show sample conversion rates
        sample_conversions = merged_df[merged_df['Conversion_Rate'].notna()]['Conversion_Rate'].head()
        if not sample_conversions.empty:
            print(f"Sample conversion rates: {sample_conversions.tolist()}")
    
    # Final summary
    print(f"\n" + "="*50)
    print(f"MERGE SUMMARY")
    print(f"="*50)
    print(f"Total agents in final dataset: {len(merged_df)}")
    print(f"Agents with Team info: {merged_df['Team'].notna().sum() if 'Team' in merged_df.columns else 0}")
    print(f"Agents with Subgroup info: {merged_df['Subgroup'].notna().sum() if 'Subgroup' in merged_df.columns else 0}")
    
    data_coverage = {}
    if 'CC_Pct' in merged_df.columns:
        data_coverage['CC'] = merged_df['CC_Pct'].notna().sum()
    if 'UP_Pct' in merged_df.columns:
        data_coverage['UP'] = merged_df['UP_Pct'].notna().sum()
    if any(col in merged_df.columns for col in ['Referral_Leads', 'Referral_Showups', 'Referral_Paid']):
        re_cols = [col for col in ['Referral_Leads', 'Referral_Showups', 'Referral_Paid'] if col in merged_df.columns]
        data_coverage['Referral'] = merged_df[re_cols].notna().any(axis=1).sum()
    
    for data_type, count in data_coverage.items():
        print(f"Agents with {data_type} data: {count}")
    
    # Save JSON output if requested
    if json_output:
        dataframe_to_json_by_name(merged_df, json_output)
    
    # Debug: Show final DataFrame info
    print(f"Final DataFrame shape: {merged_df.shape}")
    print(f"Final DataFrame columns: {list(merged_df.columns)}")
    
    # Check if Total_Leads column exists and show sample data
    if 'Total_Leads' in merged_df.columns:
        non_zero_leads = merged_df[merged_df['Total_Leads'].notna() & (merged_df['Total_Leads'] > 0)]
        print(f"Agents with Total_Leads data: {len(non_zero_leads)}")
        if len(non_zero_leads) > 0:
            print("Sample Total_Leads data:")
            print(non_zero_leads[['Name', 'Total_Leads']].head())
    else:
        print("WARNING: Total_Leads column not found in final DataFrame!")
    
    return merged_df

if __name__ == '__main__':
    # Example usage of the flexible ETL pipeline
    # NOTE: Update the file paths below to point to your actual Excel files
    print("="*60)
    print("EXAMPLE 1: Process all three files")
    print("="*60)
    
    # Process all three files (equivalent to merge_all_etl)
    # TODO: Replace these file paths with your actual Excel file paths
    result_all = flexible_etl_pipeline(
        cc_file='1609CC.xlsx',  # Update this path
        up_file='[CM]Middle East M-2 Cumulative Upgrade Rate_CM_20250917_1223 - Copy.xlsx',  # Update this path
        re_file='CM teams .xlsx',  # Update this path
        fixed_file=None,  # Add your fixed rate file path here if available
        json_output='result_all_data.json'  # JSON output file
    )
    
    print(f"\nResult shape: {result_all.shape}")
    print(f"Columns: {list(result_all.columns)}")
    print("\nFirst 5 rows:")
    print(result_all.head())
