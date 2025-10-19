from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import traceback
import sys
import pandas as pd
import json
import requests
from datetime import datetime, timedelta

# Import your ETL pipeline
from script import flexible_etl_pipeline, dataframe_to_json_by_name

# Configure Flask to serve static files from dist folder in production
# Be resilient to different working directories by resolving absolute path
dist_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
static_folder = dist_path if os.path.exists(dist_path) else None
app = Flask(__name__, static_folder=static_folder, static_url_path='')

# Log where static files are expected at runtime
try:
    index_candidate = os.path.join(static_folder or '', 'index.html')
    print(f"[Startup] static_folder={static_folder} index_exists={os.path.exists(index_candidate)} path={index_candidate}")
except Exception as _e:
    pass

# CORS configuration for development and production
# Railway will provide the actual URL, but we'll configure for common patterns
allowed_origins = [
    "http://localhost:3000",  # Local development
    "http://localhost:5000",  # Vite dev server (port 5000)
    "http://localhost:5001",  # Vite dev server (port 5001)
    "http://localhost:5002",  # Vite dev server (port 5002)
    "http://localhost:5003",  # Vite dev server (port 5003)
    "http://localhost:5004",  # Vite dev server (port 5004)
    "http://localhost:5005",  # Vite dev server (port 5005)
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5001",
    "http://127.0.0.1:5002",
    "http://127.0.0.1:5003",
    "http://127.0.0.1:5004",
    "http://127.0.0.1:5005",
    "http://127.0.0.1:5173",
    "https://lovable.dev",  # Lovable production
    "https://*.lovable.dev",  # Lovable subdomains
    "https://gptengineer.app",  # GPT Engineer production
    "https://*.gptengineer.app",  # GPT Engineer subdomains
]

# Add Railway domain if available
railway_url = os.environ.get('RAILWAY_STATIC_URL')
if railway_url:
    allowed_origins.append(f"https://{railway_url}")

# Add Replit domain if available
replit_domain = os.environ.get('REPLIT_DEV_DOMAIN')
if replit_domain:
    allowed_origins.extend([
        f"https://{replit_domain}",
        f"http://{replit_domain}",
        f"https://{replit_domain}:5000",
        f"http://{replit_domain}:5000"
    ])

# For development, allow all origins
if os.environ.get('FLASK_ENV') == 'development':
    CORS(app, origins="*", supports_credentials=True)
else:
    CORS(app, origins=allowed_origins, supports_credentials=True)

# Configuration
UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), 'uploads')  # Use temp directory
NOTES_FOLDER = os.path.join(tempfile.gettempdir(), 'notes')  # For storing notes
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# OpenRouter AI configuration
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Create upload and notes directories if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(NOTES_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'ETL Backend is running',
        'port': os.environ.get('PORT', 'unknown'),
        'upload_dir': UPLOAD_FOLDER
    })

@app.route('/process-etl', methods=['POST'])
def process_etl():
    """
    Process ETL pipeline and return agent data as JSON
    
    Expected request format:
    {
        "files": {
            "cc_file": "path/to/cc.xlsx",  // optional
            "up_file": "path/to/up.xlsx",  // optional  
            "re_file": "path/to/re.xlsx"   // optional
        }
    }
    
    Returns:
    {
        "success": true,
        "data": {
            "Person Name 1": {...},
            "Person Name 2": {...}
        },
        "metadata": {
            "total_records": 123,
            "shape": [123, 10],
            "columns": ["Name", "Subgroup", ...]
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'files' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing files configuration'
            }), 400
        
        files = data['files']
        
        # Extract file paths
        cc_file = files.get('cc_file')
        up_file = files.get('up_file') 
        re_file = files.get('re_file')
        
        # Validate that at least one file is provided
        if not any([cc_file, up_file, re_file]):
            return jsonify({
                'success': False,
                'error': 'At least one file must be provided'
            }), 400
        
        # Validate file paths exist
        for file_type, file_path in [('cc_file', cc_file), ('up_file', up_file), ('re_file', re_file)]:
            if file_path and not os.path.exists(file_path):
                return jsonify({
                    'success': False,
                    'error': f'{file_type} not found: {file_path}'
                }), 400
        
        # Run ETL pipeline
        result_df = flexible_etl_pipeline(
            cc_file=cc_file,
            up_file=up_file,
            re_file=re_file
        )
        
        # Convert to JSON format with Name as key
        agent_data = dataframe_to_json_by_name(result_df)
        
        # Prepare response
        response = {
            'success': True,
            'data': agent_data,
            'metadata': {
                'total_records': len(agent_data),
                'shape': list(result_df.shape),
                'columns': list(result_df.columns)
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in process_etl: {error_trace}", file=sys.stderr)
        
        return jsonify({
            'success': False,
            'error': str(e),
            'trace': error_trace if app.debug else None
        }), 500

@app.route('/upload-files', methods=['POST'])
def upload_files():
    """
    Upload Excel files for ETL processing
    
    Expected form data with files:
    - cc_file (optional): CC Excel file
    - up_file (optional): UP Excel file  
    - re_file (optional): RE Excel file
    
    Returns file paths for use in /process-etl endpoint
    """
    try:
        uploaded_files = {}
        
        # Handle each file type
        for file_type in ['cc_file', 'up_file', 're_file']:
            if file_type in request.files:
                file = request.files[file_type]
                
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Add timestamp to avoid conflicts
                    import time
                    timestamp = str(int(time.time()))
                    filename = f"{timestamp}_{filename}"
                    
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(file_path)
                    uploaded_files[file_type] = file_path
        
        if not uploaded_files:
            return jsonify({
                'success': False,
                'error': 'No valid files uploaded'
            }), 400
        
        return jsonify({
            'success': True,
            'uploaded_files': uploaded_files,
            'message': f'Successfully uploaded {len(uploaded_files)} file(s)'
        })
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in upload_files: {error_trace}", file=sys.stderr)
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/process-agent-data', methods=['POST'])
@app.route('/api/process-agent-data', methods=['POST'])
def process_agent_data():
    """
    Upload files and process ETL pipeline for agent data
    
    Expected form data with files:
    - cc_file (optional): CC Excel file
    - up_file (optional): UP Excel file  
    - re_file (optional): RE Excel file
    - fixed_file (optional): Fixed Rate Excel file
    
    Returns agent data in the format expected by frontend
    """
    try:
        print(f"Received request: {request.method} to /process-agent-data")
        print(f"Content-Type: {request.content_type}")
        print(f"Request files: {list(request.files.keys())}")
        print(f"Request form: {list(request.form.keys())}")
        
        # Upload and process files
        uploaded_files = {}
        
        for file_type in ['cc_file', 'up_file', 're_file', 'fixed_file', 'all_leads_file']:
            if file_type in request.files:
                file = request.files[file_type]
                print(f"Processing {file_type}: {file.filename}")
                
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    import time
                    timestamp = str(int(time.time()))
                    filename = f"{timestamp}_{filename}"
                    
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(file_path)
                    uploaded_files[file_type] = file_path
                    print(f"Saved {file_type} to: {file_path}")
                elif file and file.filename != '':
                    print(f"File {file.filename} not allowed (invalid extension)")
                else:
                    print(f"Empty file for {file_type}")
        
        print(f"Uploaded files: {uploaded_files}")
        
        if not uploaded_files:
            error_msg = 'No valid files uploaded'
            if not request.files:
                error_msg = 'No files in request. Expected multipart/form-data with file uploads.'
            elif all(f.filename == '' for f in request.files.values()):
                error_msg = 'All uploaded files are empty'
            else:
                invalid_files = [f"{k}: {v.filename}" for k, v in request.files.items() if not allowed_file(v.filename)]
                error_msg = f'No valid Excel files found. Invalid files: {invalid_files}. Only .xlsx and .xls files are allowed.'
            
            print(f"Error: {error_msg}")
            return jsonify({
                'success': False,
                'error': error_msg,
                'debug': {
                    'received_files': list(request.files.keys()),
                    'allowed_extensions': list(ALLOWED_EXTENSIONS)
                }
            }), 400
        
        # Process ETL with uploaded files
        try:
            result_df = flexible_etl_pipeline(
                cc_file=uploaded_files.get('cc_file'),
                up_file=uploaded_files.get('up_file'),
                re_file=uploaded_files.get('re_file'),
                fixed_file=uploaded_files.get('fixed_file'),
                all_leads_file=uploaded_files.get('all_leads_file')
            )
        except Exception as e:
            print(f"ETL Processing Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': f'ETL processing failed: {str(e)}',
                'debug': {
                    'uploaded_files': {k: v is not None for k, v in uploaded_files.items()},
                    'error_type': type(e).__name__
                }
            }), 500
        
        # Convert DataFrame to list of agent objects for frontend
        agent_list = []
        
        # Debug: Print available columns
        print(f"Available columns in result DataFrame: {list(result_df.columns)}")
        
        # Debug: Check for specific columns we need
        required_cols = ['Referral_Ach_Pct', 'Conversion_Rate', 'Referral_Leads', 'Referral_Showups', 'Referral_Paid']
        for col in required_cols:
            if col in result_df.columns:
                non_null_count = result_df[col].notna().sum()
                print(f"Column '{col}': Found, {non_null_count} non-null values")
                if non_null_count > 0:
                    sample_values = result_df[result_df[col].notna()][col].head(3).tolist()
                    print(f"  Sample values: {sample_values}")
            else:
                print(f"Column '{col}': NOT FOUND")
        
        # Look for any column containing 'ach' or 'referral'
        achievement_cols = [col for col in result_df.columns if 'ach' in col.lower() or 'referral' in col.lower()]
        print(f"Columns containing 'ach' or 'referral': {achievement_cols}")
        
        for idx, row in result_df.iterrows():
            # Helper function to safely get scalar value from potentially Series data
            def safe_get(value):
                # Handle Series first to avoid boolean evaluation issues
                if hasattr(value, 'iloc'):  # If it's a Series
                    if len(value) == 0:
                        return None
                    first_val = value.iloc[0]
                    # For the first value from series, check if it's a list
                    if isinstance(first_val, (list, tuple)):
                        return first_val
                    try:
                        return None if pd.isna(first_val) else first_val
                    except (ValueError, TypeError):
                        return first_val
                # Handle lists/arrays directly
                elif isinstance(value, (list, tuple)):
                    return value  # Return the list as-is
                else:
                    # Handle scalar values - check for NaN safely
                    try:
                        return None if pd.isna(value) else value
                    except (ValueError, TypeError):
                        # If pd.isna fails (e.g., with complex objects), return the value
                        return value
            
            # Helper function to safely get column value with fallback
            def safe_get_column(row, column_name, default=None):
                try:
                    if column_name in row.index:
                        # Special handling for Unrecovered_Students column
                        if column_name == 'Unrecovered_Students':
                            value = row[column_name]
                            if isinstance(value, (list, tuple)):
                                return value
                            elif hasattr(value, 'iloc') and len(value) > 0:
                                return value.iloc[0] if isinstance(value.iloc[0], (list, tuple)) else default
                            else:
                                return default
                        else:
                            return safe_get(row[column_name])
                    else:
                        return default
                except (KeyError, IndexError, ValueError, TypeError):
                    return default
            
            # Safe extraction of values
            name_val = safe_get_column(row, 'Name', '')
            team_val = safe_get_column(row, 'Team', '')
            group_val = safe_get_column(row, 'Group', '')
            students_val = safe_get_column(row, 'Students', 0)
            fixed_pct_val = safe_get_column(row, 'Fixed_Pct')
            cc_pct_val = safe_get_column(row, 'CC_Pct')
            sc_pct_val = safe_get_column(row, 'SC_Pct')
            up_pct_val = safe_get_column(row, 'UP_Pct')
            ref_leads_val = safe_get_column(row, 'Referral_Leads', 0)
            ref_showups_val = safe_get_column(row, 'Referral_Showups', 0)
            ref_paid_val = safe_get_column(row, 'Referral_Paid', 0)
            ref_ach_pct_val = safe_get_column(row, 'Referral_Ach_Pct')
            conversion_rate_val = safe_get_column(row, 'Conversion_Rate')
            
            # Debug: Print column availability for first agent only
            if name_val and len(agent_list) == 0:  # First agent only
                print(f"🔍 DEBUGGING FIRST AGENT ({name_val}):")
                print(f"   Available columns: {list(row.index)}")
                print(f"   Referral_Ach_Pct value: {ref_ach_pct_val}")
                if 'Referral_Ach_Pct' not in row.index:
                    print(f"   ❌ Referral_Ach_Pct column MISSING!")
                    # Look for similar columns
                    ref_cols = [col for col in row.index if 'ref' in col.lower() or 'ach' in col.lower()]
                    print(f"   Similar columns: {ref_cols}")
                else:
                    print(f"   ✅ Referral_Ach_Pct column found")
            
            total_leads_val = safe_get_column(row, 'Total_Leads', 0)
            recovered_leads_val = safe_get_column(row, 'Recovered_Leads', 0)
            unrecovered_leads_val = safe_get_column(row, 'Unrecovered_Leads', 0)
            unrecovered_students_val = safe_get_column(row, 'Unrecovered_Students', [])
            
            agent_data = {
                'id': str(name_val) if name_val is not None else '',
                'name': str(name_val) if name_val is not None else '',
                'team': str(team_val) if team_val is not None else '',
                'group': str(group_val) if group_val is not None else '',
                'students': int(students_val) if students_val is not None else 0,
                'fixedPct': float(fixed_pct_val) if fixed_pct_val is not None else None,
                'ccPct': float(cc_pct_val) if cc_pct_val is not None else None,
                'scPct': float(sc_pct_val) if sc_pct_val is not None else None,
                'upPct': float(up_pct_val) if up_pct_val is not None else None,
                'referralLeads': int(ref_leads_val) if ref_leads_val is not None else 0,
                'referralShowups': int(ref_showups_val) if ref_showups_val is not None else 0,
                'referralPaid': int(ref_paid_val) if ref_paid_val is not None else 0,
                'referralAchPct': float(ref_ach_pct_val) if ref_ach_pct_val is not None else None,
                'conversionRate': float(conversion_rate_val) if conversion_rate_val is not None else None,
                'totalLeads': int(total_leads_val) if total_leads_val is not None else 0,
                'recoveredLeads': int(recovered_leads_val) if recovered_leads_val is not None else 0,
                'unrecoveredLeads': int(unrecovered_leads_val) if unrecovered_leads_val is not None else 0,
                'unrecoveredStudents': unrecovered_students_val if unrecovered_students_val is not None else []
            }
            agent_list.append(agent_data)
        
        # Clean up uploaded files after processing
        for file_path in uploaded_files.values():
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as cleanup_error:
                print(f"Warning: Could not cleanup file {file_path}: {cleanup_error}")
        
        response = {
            'success': True,
            'agents': agent_list,
            'total_agents': len(agent_list),
            'processedFiles': list(uploaded_files.keys())
        }
        
        return jsonify(response)
        
    except Exception as e:
        # Clean up uploaded files on error
        if 'uploaded_files' in locals():
            for file_path in uploaded_files.values():
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except:
                    pass
        
        error_trace = traceback.format_exc()
        print(f"Error in process_agent_data: {error_trace}", file=sys.stderr)
        
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/test-upload', methods=['POST'])
def test_upload():
    """Test endpoint to debug file upload issues"""
    try:
        result = {
            'content_type': request.content_type,
            'files': {},
            'form': dict(request.form),
            'method': request.method
        }
        
        for key, file in request.files.items():
            file_content = file.read()
            result['files'][key] = {
                'filename': file.filename,
                'size': len(file_content),
                'content_type': file.content_type
            }
            file.seek(0)  # Reset file pointer
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/test-format', methods=['GET'])
def test_format():
    """
    Show expected response structure for agent data
    """
    sample_agents = [
        {
            'id': 'agent_001',
            'name': 'John Doe',
            'team': 'Team Alpha',
            'group': 'ME-EG-001',
            'students': 25,
            'fixedPct': 85.5,
            'ccPct': 78.2,
            'scPct': 92.1,
            'upPct': 65.4,
            'referralLeads': 12,
            'referralShowups': 8,
            'referralPaid': 5
        },
        {
            'id': 'agent_002', 
            'name': 'Jane Smith',
            'team': 'Team Beta',
            'group': 'ME-EG-002',
            'students': 18,
            'fixedPct': None,  # Can be null
            'ccPct': 82.7,
            'scPct': None,     # Can be null
            'upPct': 71.3,
            'referralLeads': 0,
            'referralShowups': 0,
            'referralPaid': 0
        }
    ]
    
    return jsonify({
        'success': True,
        'agents': sample_agents,
        'totalCount': len(sample_agents),
        'processedFiles': ['cc_file', 'up_file'],
        'note': 'This is the expected response format for /process-agent-data'
    })

# Serve React app for production deployment
@app.route('/')
def serve_index():
    """Serve the React app index.html"""
    # Try absolute dist detection if static_folder wasn't set at import time
    if not app.static_folder:
        maybe_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')
        if os.path.exists(os.path.join(maybe_dist, 'index.html')):
            app.static_folder = maybe_dist

    index_candidate = os.path.join(app.static_folder or '', 'index.html')
    if app.static_folder and os.path.exists(index_candidate):
        return send_from_directory(app.static_folder, 'index.html')
    else:
        # Extra diagnostics in logs
        try:
            print(f"[Serve] index not found at {index_candidate}")
            if app.static_folder and os.path.exists(app.static_folder):
                print(f"[Serve] static folder contents: {os.listdir(app.static_folder)}")
            alt = os.path.join(os.getcwd(), 'dist')
            if os.path.exists(os.path.join(alt, 'index.html')):
                print(f"[Serve] Found alternative dist at {alt}")
                app.static_folder = alt
                return send_from_directory(app.static_folder, 'index.html')
        except Exception as _e:
            pass
        return jsonify({"message": "Frontend not built. Run 'npm run build' first."}), 404

@app.route('/<path:path>')
def serve_static_or_index(path):
    """Serve static files or React app for client-side routing"""
    if app.static_folder:
        # Try to serve static file first
        static_file_path = os.path.join(app.static_folder, path)
        if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
            return send_from_directory(app.static_folder, path)
        
        # For client-side routing, serve index.html
        index_path = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, 'index.html')
    
    return jsonify({"error": "File not found"}), 404

# AI Analysis Functions
def call_openrouter_ai(prompt, agent_data=None):
    """Call OpenRouter AI for coaching insights"""
    if not OPENROUTER_API_KEY:
        return {"error": "OpenRouter API key not configured", "fallback": True}
    
    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app.replit.dev",
            "X-Title": "CMLens Dashboard"
        }
        
        # Format prompt with agent data if provided
        formatted_prompt = prompt
        if agent_data:
            formatted_prompt += f"\n\nAgent Performance Data:\n{json.dumps(agent_data, indent=2)}"
        
        data = {
            "model": "anthropic/claude-3-haiku",
            "messages": [
                {"role": "user", "content": formatted_prompt}
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }
        
        response = requests.post(f"{OPENROUTER_BASE_URL}/chat/completions", 
                               headers=headers, json=data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "analysis": result['choices'][0]['message']['content'],
                "fallback": False
            }
        else:
            print(f"OpenRouter API error: {response.status_code} - {response.text}")
            return {"error": f"API Error: {response.status_code}", "fallback": True}
            
    except Exception as e:
        print(f"OpenRouter AI error: {str(e)}")
        return {"error": str(e), "fallback": True}

def get_fallback_analysis(analysis_type, agent_data=None):
    """Provide rule-based analysis when AI is unavailable"""
    if analysis_type == "coaching":
        return generate_coaching_insights(agent_data)
    elif analysis_type == "meeting":
        return generate_meeting_insights(agent_data)
    return "Basic analysis: Review performance metrics and identify areas for improvement."

def generate_coaching_insights(agent_data):
    """Generate rule-based coaching insights"""
    if not agent_data:
        return "No agent data available for analysis."
    
    insights = []
    metrics = agent_data.get('metrics', {})
    
    # Analyze each metric
    fixed_pct = metrics.get('fixedPct', 0) * 100 if metrics.get('fixedPct') else 0
    cc_pct = metrics.get('ccPct', 0) * 100 if metrics.get('ccPct') else 0
    sc_pct = metrics.get('scPct', 0) * 100 if metrics.get('scPct') else 0
    up_pct = metrics.get('upPct', 0) * 100 if metrics.get('upPct') else 0
    
    if fixed_pct < 70:
        insights.append(f"• Student retention (Fixed%: {fixed_pct:.1f}%) is below target (70%). Focus on improving class engagement and addressing student concerns early.")
    
    if cc_pct < 60:
        insights.append(f"• Class coverage (CC%: {cc_pct:.1f}%) needs improvement. Encourage students to attend at least 12 classes for better outcomes.")
    
    if sc_pct < 30:
        insights.append(f"• Success calls (SC%: {sc_pct:.1f}%) are underperforming. Review call scripts and timing for M1-M4 super class consumption.")
    
    if up_pct < 15:
        insights.append(f"• Upselling (UP%: {up_pct:.1f}%) is below expectations. Focus on identifying upgrade opportunities and improving sales techniques.")
    
    if not insights:
        insights.append("• Performance is meeting targets. Consider advanced coaching for further optimization.")
    
    return "\n".join(insights)

def generate_meeting_insights(agent_data):
    """Generate rule-based meeting discussion points"""
    if not agent_data:
        return "No agent data available for meeting discussion."
    
    discussion_points = []
    metrics = agent_data.get('metrics', {})
    
    # Calculate overall score
    score = calculate_agent_score(metrics)
    
    if score < 60:
        discussion_points.append("• Priority agent requiring immediate attention and action plan")
        discussion_points.append("• Discuss specific challenges and barriers to performance")
        discussion_points.append("• Set clear improvement targets with timeline")
    elif score < 80:
        discussion_points.append("• Agent showing potential but needs focused coaching")
        discussion_points.append("• Identify 1-2 key areas for improvement")
    else:
        discussion_points.append("• Strong performer - discuss growth opportunities")
        discussion_points.append("• Consider mentoring responsibilities for team")
    
    return "\n".join(discussion_points)

def calculate_agent_score(metrics):
    """Calculate weighted agent performance score"""
    # Default weights based on business importance
    weights = {'fixedPct': 0.3, 'ccPct': 0.25, 'scPct': 0.25, 'upPct': 0.2}
    
    score = 0
    total_weight = 0
    
    for metric, weight in weights.items():
        if metrics.get(metric) is not None:
            # Convert to percentage and apply weight
            value = metrics[metric] * 100 if metrics[metric] < 1 else metrics[metric]
            score += value * weight
            total_weight += weight
    
    return score / total_weight if total_weight > 0 else 0

def get_agent_category(score):
    """Categorize agent based on performance score"""
    if score >= 85:
        return "Elite"
    elif score >= 75:
        return "Strong"
    elif score >= 65:
        return "Stable"
    elif score >= 50:
        return "Watch"
    else:
        return "Critical"

# Notes Management Functions
def save_notes(notes_type, agent_id, content, week=None):
    """Save coaching or meeting notes"""
    try:
        # Sanitize inputs to prevent path traversal
        safe_notes_type = secure_filename(notes_type)
        safe_agent_id = secure_filename(agent_id)
        safe_week = secure_filename(str(week)) if week else None
        
        filename = f"{safe_notes_type}_{safe_agent_id}"
        if safe_week:
            filename += f"_week_{safe_week}"
        filename += ".json"
        
        filepath = os.path.join(NOTES_FOLDER, filename)
        
        notes_data = {
            "agent_id": agent_id,
            "type": notes_type,
            "content": content,
            "week": week,
            "updated_at": datetime.now().isoformat()
        }
        
        with open(filepath, 'w') as f:
            json.dump(notes_data, f, indent=2)
        
        return {"success": True, "message": "Notes saved successfully"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

def load_notes(notes_type, agent_id, week=None):
    """Load coaching or meeting notes"""
    try:
        # Sanitize inputs to prevent path traversal
        safe_notes_type = secure_filename(notes_type)
        safe_agent_id = secure_filename(agent_id)
        safe_week = secure_filename(str(week)) if week else None
        
        filename = f"{safe_notes_type}_{safe_agent_id}"
        if safe_week:
            filename += f"_week_{safe_week}"
        filename += ".json"
        
        filepath = os.path.join(NOTES_FOLDER, filename)
        
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
        else:
            return {"content": "", "agent_id": agent_id, "type": notes_type, "week": week}
    
    except Exception as e:
        return {"error": str(e)}

# API Endpoints for Targets and Meetings Features

@app.route('/api/coaching-notes/<agent_id>', methods=['GET', 'POST'])
def handle_coaching_notes(agent_id):
    """Save or load coaching notes for an agent"""
    if request.method == 'POST':
        data = request.get_json()
        content = data.get('content', '')
        result = save_notes('coaching', agent_id, content)
        return jsonify(result)
    
    else:  # GET
        notes = load_notes('coaching', agent_id)
        return jsonify(notes)

@app.route('/api/meeting-notes/<agent_id>/<week>', methods=['GET', 'POST'])
def handle_meeting_notes(agent_id, week):
    """Save or load meeting notes for an agent for a specific week"""
    if request.method == 'POST':
        data = request.get_json()
        content = data.get('content', '')
        result = save_notes('meeting', agent_id, content, week)
        return jsonify(result)
    
    else:  # GET
        notes = load_notes('meeting', agent_id, week)
        return jsonify(notes)

@app.route('/api/ai-analysis', methods=['POST'])
def ai_analysis():
    """Generate AI-powered analysis for coaching or meetings"""
    try:
        data = request.get_json()
        analysis_type = data.get('type', 'coaching')  # 'coaching' or 'meeting'
        agent_data = data.get('agent_data')
        custom_prompt = data.get('prompt', '')
        
        # Prepare prompt based on analysis type
        if analysis_type == 'coaching':
            base_prompt = """As an expert performance coach, analyze this agent's performance data and provide specific, actionable coaching recommendations. Focus on:
1. Strengths to leverage
2. Areas needing improvement
3. Specific action steps
4. Coaching strategy recommendations

Provide practical, implementable advice that a manager can use immediately."""
        
        elif analysis_type == 'meeting':
            base_prompt = """As a team management consultant, analyze this agent's performance and generate specific discussion points for a weekly team meeting. Include:
1. Key performance insights
2. Questions to ask the agent
3. Action items and next steps
4. Timeline for improvement

Focus on constructive dialogue and clear accountability measures."""
        
        else:
            base_prompt = custom_prompt or "Analyze this agent's performance data and provide insights."
        
        # Try AI analysis first
        ai_result = call_openrouter_ai(base_prompt, agent_data)
        
        if ai_result.get('fallback'):
            # Use rule-based fallback
            fallback_analysis = get_fallback_analysis(analysis_type, agent_data)
            return jsonify({
                "success": True,
                "analysis": fallback_analysis,
                "source": "fallback",
                "message": "AI unavailable, using rule-based analysis"
            })
        
        return jsonify({
            "success": True,
            "analysis": ai_result.get('analysis', ''),
            "source": "ai"
        })
    
    except Exception as e:
        print(f"AI analysis error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/agent-performance/<agent_id>', methods=['GET'])
def get_agent_performance(agent_id):
    """Get detailed performance analysis for a specific agent"""
    try:
        # This would integrate with your existing agent data
        # For now, return a structured response for the frontend
        
        # You would typically fetch this from your existing agent data
        # For demo, using sample data structure
        sample_metrics = {
            "fixedPct": 0.65,
            "ccPct": 0.72,
            "scPct": 0.28,
            "upPct": 0.18,
            "students": 45,
            "referralLeads": 12,
            "referralShowups": 8,
            "referralPaid": 5
        }
        
        score = calculate_agent_score(sample_metrics)
        category = get_agent_category(score)
        
        return jsonify({
            "success": True,
            "agent": {
                "id": agent_id,
                "name": agent_id,
                "score": round(score, 1),
                "category": category,
                "metrics": sample_metrics
            }
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/team-performance', methods=['GET'])
def get_team_performance():
    """Get team performance summary for meetings tab"""
    try:
        week = request.args.get('week', '1')
        threshold = float(request.args.get('threshold', 60))
        
        # Enhanced team data with weaknesses analysis
        agents_data = [
            {
                "id": "EGLP-ahmedamrali",
                "name": "Ahmed Amrali", 
                "team": "Team Alpha",
                "score": 45.2,
                "category": "Critical",
                "metrics": {"fixedPct": 0.45, "ccPct": 0.38, "scPct": 0.22, "upPct": 0.08},
                "weaknesses": ["Student retention below 70%", "Class coverage needs improvement", "Upselling opportunities missed"]
            },
            {
                "id": "EGLP-ahmedsalah",
                "name": "Ahmed Salah",
                "team": "Team Alpha", 
                "score": 58.7,
                "category": "Watch",
                "metrics": {"fixedPct": 0.62, "ccPct": 0.55, "scPct": 0.31, "upPct": 0.12},
                "weaknesses": ["Success calls below target", "Upselling rate needs improvement"]
            },
            {
                "id": "EGLP-aliam",
                "name": "Ali Mohamed",
                "team": "Team Alpha",
                "score": 72.3,
                "category": "Stable", 
                "metrics": {"fixedPct": 0.68, "ccPct": 0.75, "scPct": 0.35, "upPct": 0.18},
                "weaknesses": []
            },
            {
                "id": "EGLP-amalYossef",
                "name": "Amal Yossef",
                "team": "Team Beta",
                "score": 38.1,
                "category": "Critical",
                "metrics": {"fixedPct": 0.35, "ccPct": 0.42, "scPct": 0.18, "upPct": 0.05},
                "weaknesses": ["Student retention critically low", "All metrics below target", "Requires immediate intervention"]
            },
            {
                "id": "EGLP-amira",
                "name": "Amira Hassan",
                "team": "Team Beta",
                "score": 81.4,
                "category": "Strong",
                "metrics": {"fixedPct": 0.78, "ccPct": 0.82, "scPct": 0.42, "upPct": 0.22},
                "weaknesses": []
            }
        ]
        
        # Calculate team statistics
        total_agents = len(agents_data)
        underperforming_agents = [agent for agent in agents_data if agent["score"] < threshold]
        underperforming_count = len(underperforming_agents)
        average_score = sum(agent["score"] for agent in agents_data) / total_agents if agents_data else 0
        
        sample_team_data = {
            "week": week,
            "threshold": threshold,
            "total_agents": total_agents,
            "underperforming_count": underperforming_count,
            "average_score": round(average_score, 1),
            "agents": agents_data
        }
        
        return jsonify({
            "success": True,
            "data": sample_team_data
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/teams-agents', methods=['GET'])
def get_teams_agents():
    """Get available teams and agents for frontend selectors"""
    try:
        # This should ideally come from your database/ETL data
        # For now, providing structure that matches the actual agent data
        teams_data = {
            "teams": ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"],
            "agents_by_team": {
                "Team Alpha": [
                    {"id": "EGLP-ahmedamrali", "name": "Ahmed Amrali"},
                    {"id": "EGLP-ahmedsalah", "name": "Ahmed Salah"}, 
                    {"id": "EGLP-aliam", "name": "Ali Mohamed"}
                ],
                "Team Beta": [
                    {"id": "EGLP-amalYossef", "name": "Amal Yossef"},
                    {"id": "EGLP-amira", "name": "Amira Hassan"}
                ],
                "Team Gamma": [
                    {"id": "EGLP-mohamed", "name": "Mohamed Hassan"},
                    {"id": "EGLP-hassan", "name": "Hassan Ali"},
                    {"id": "EGLP-fatma", "name": "Fatma Ahmed"}
                ],
                "Team Delta": [
                    {"id": "EGLP-ahmed", "name": "Ahmed Mahmoud"},
                    {"id": "EGLP-nour", "name": "Nour Ibrahim"},
                    {"id": "EGLP-omar", "name": "Omar Khaled"}
                ]
            }
        }
        
        return jsonify({
            "success": True,
            "data": teams_data
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("Starting ETL Web Backend...")
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  GET  /test-format - Show expected response format")
    print("  POST /test-upload - Debug file upload issues")
    print("  POST /process-agent-data - Upload files and process ETL (main endpoint)")
    print("  POST /upload-files - Upload Excel files only")
    print("  POST /process-etl - Process ETL with file paths")
    print()
    print("Frontend should call: POST /process-agent-data")
    print("If having issues, try: POST /test-upload first")
    print()
    
    # Get port from environment (Railway sets this dynamically)
    # Use a different port to avoid conflict with Vite dev server
    port = int(os.environ.get('PORT', 8080))  # Railway will set PORT
    
    # Check if running in production (Railway)
    is_production = os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('RAILWAY_PROJECT_ID')
    
    if is_production:
        print(f"Starting production server on port {port}")
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        print(f"Starting development server on 0.0.0.0:{port}")
        # Use 0.0.0.0 in development for deployment health checks to work
        app.run(debug=False, host='0.0.0.0', port=port)