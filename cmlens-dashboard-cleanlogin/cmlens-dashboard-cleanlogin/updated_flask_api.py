from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import traceback
import sys

# Import your ETL pipeline
from script import flexible_etl_pipeline, dataframe_to_json_by_name

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains and routes

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}
MAX_CONTENT_LENGTH = 200 * 1024 * 1024  # 200MB max file size (matches frontend)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'CMLens ETL Backend is running',
        'version': '1.0.0'
    })

@app.route('/process-agent-data', methods=['POST'])
def process_agent_data():
    """
    Upload files and process ETL pipeline to return agent performance data
    
    Expected form data with files (all optional, at least one required):
    - classConsumption: Class Consumption report file
    - fixed: Fixed report file  
    - referral: Referral report file
    - upgrade: Upgrade report file
    
    Returns:
    {
        "success": true,
        "agents": {
            "agent_name_1": {
                "agent_id": "agent_name_1",
                "team": "Team Name",
                "group": "Group Name", 
                "students": 150,
                "fixed_pct": 65.5,
                "cc_pct": 12.3,
                "sc_pct": 3.1,
                "up_pct": 28.7,
                "referral": {
                    "leads": 15,
                    "showups": 12, 
                    "paid": 8
                }
            }
        },
        "metadata": {
            "total_agents": 25,
            "processed_files": ["classConsumption", "fixed"],
            "processing_time": 2.34
        }
    }
    """
    import time
    start_time = time.time()
    
    try:
        uploaded_files = {}
        
        
        # Handle file uploads - match frontend naming
        file_mapping = {
            'classConsumption': 'cc_file',
            'fixed': 'fixed_file', 
            'referral': 're_file',
            'upgrade': 'up_file'
        }
        
        # Also check the mapped backend keys that the frontend actually sends
        backend_keys = ['cc_file', 'fixed_file', 're_file', 'up_file']
        
        for frontend_key, backend_key in file_mapping.items():
            if frontend_key in request.files:
                file = request.files[frontend_key]
                
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Add timestamp to avoid conflicts
                    timestamp = str(int(time.time()))
                    filename = f"{timestamp}_{filename}"
                    
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(file_path)
                    uploaded_files[backend_key] = file_path
        
        # Also check for files sent with backend keys directly
        for backend_key in backend_keys:
            if backend_key in request.files:
                file = request.files[backend_key]
                
                if file and file.filename != '' and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    # Add timestamp to avoid conflicts
                    timestamp = str(int(time.time()))
                    filename = f"{timestamp}_{filename}"
                    
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(file_path)
                    uploaded_files[backend_key] = file_path
        
        if not uploaded_files:
            return jsonify({
                'success': False,
                'error': 'No valid files uploaded. Please upload at least one file (classConsumption, fixed, referral, or upgrade).'
            }), 400
        
        # Process ETL with uploaded files
        result_df = flexible_etl_pipeline(
            cc_file=uploaded_files.get('cc_file'),
            up_file=uploaded_files.get('up_file'),
            re_file=uploaded_files.get('re_file'),
            fixed_file=uploaded_files.get('fixed_file')  # Added fixed file parameter
        )
        
        # Convert to the expected frontend format
        agents_data = convert_dataframe_to_frontend_format(result_df)
        
        # Clean up uploaded files
        for file_path in uploaded_files.values():
            try:
                os.remove(file_path)
            except:
                pass  # Ignore cleanup errors
        
        processing_time = time.time() - start_time
        
        response = {
            'success': True,
            'agents': agents_data,
            'metadata': {
                'total_agents': len(agents_data),
                'processed_files': [k for k, v in file_mapping.items() if v in uploaded_files],
                'processing_time': round(processing_time, 2),
                'shape': list(result_df.shape) if result_df is not None else [0, 0],
                'columns': list(result_df.columns) if result_df is not None else []
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in process_agent_data: {error_trace}", file=sys.stderr)
        
        # Clean up files on error
        if 'uploaded_files' in locals():
            for file_path in uploaded_files.values():
                try:
                    os.remove(file_path)
                except:
                    pass
        
        return jsonify({
            'success': False,
            'error': str(e),
            'trace': error_trace if app.debug else None
        }), 500

def convert_dataframe_to_frontend_format(df):
    """
    Convert your ETL pipeline dataframe to the expected frontend format
    
    Expected DataFrame columns (modify based on your actual ETL output):
    - Name (agent identifier)
    - Team 
    - Group/Subgroup
    - Students (student count)
    - Fixed_Pct (fixed percentage)
    - CC_Pct (class consumption percentage) 
    - SC_Pct (super class consumption percentage)
    - UP_Pct (upgrade percentage)
    - Referral_Leads (optional)
    - Referral_Showups (optional)
    - Referral_Paid (optional)
    """
    
    if df is None or df.empty:
        return {}
    
    agents = {}
    
    for _, row in df.iterrows():
        # Extract agent identifier (adjust column name as needed)
        agent_id = str(row.get('Name', row.get('Agent_ID', row.get('Agent', f"agent_{_}"))))
        
        # Build agent data structure
        agent_data = {
            "agent_id": agent_id,
            "team": str(row.get('Team', row.get('Team_Name', 'Unknown Team'))),
            "group": str(row.get('Group', row.get('Subgroup', row.get('Group_Name', 'Unknown Group')))),
            "students": int(row.get('Students', row.get('Student_Count', 0))),
            "fixed_pct": safe_float(row.get('Fixed_Pct', row.get('Fixed_Rate'))),
            "cc_pct": safe_float(row.get('CC_Pct', row.get('Class_Consumption_Pct'))),
            "sc_pct": safe_float(row.get('SC_Pct', row.get('Super_Class_Consumption_Pct'))),
            "up_pct": safe_float(row.get('UP_Pct', row.get('Upgrade_Pct'))),
            "referral": {
                "leads": int(row.get('Referral_Leads', row.get('Leads', 0))),
                "showups": int(row.get('Referral_Showups', row.get('Showups', 0))),
                "paid": int(row.get('Referral_Paid', row.get('Paid', 0)))
            }
        }
        
        agents[agent_id] = agent_data
    
    return agents

def safe_float(value):
    """Safely convert value to float, return None if invalid"""
    try:
        if value is None or str(value).lower() in ['nan', 'null', '', 'none']:
            return None
        return float(value)
    except (ValueError, TypeError):
        return None

@app.route('/test-format', methods=['GET'])
def test_format():
    """
    Test endpoint to show expected response format
    """
    sample_response = {
        "success": True,
        "agents": {
            "john_doe": {
                "agent_id": "john_doe",
                "team": "EGLP1 EGSS-Sarah",
                "group": "EGLP01小组",
                "students": 185,
                "fixed_pct": 65.2,
                "cc_pct": 12.5,
                "sc_pct": 3.2,
                "up_pct": 28.7,
                "referral": {
                    "leads": 18,
                    "showups": 14,
                    "paid": 8
                }
            },
            "jane_smith": {
                "agent_id": "jane_smith", 
                "team": "EGLP2 EGSS-Ahmed",
                "group": "EGLP02小组",
                "students": 312,
                "fixed_pct": None,  # Can be null
                "cc_pct": 15.3,
                "sc_pct": 5.1,
                "up_pct": 31.4,
                "referral": {
                    "leads": 24,
                    "showups": 19,
                    "paid": 12
                }
            }
        },
        "metadata": {
            "total_agents": 2,
            "processed_files": ["classConsumption", "fixed"],
            "processing_time": 1.23
        }
    }
    
    return jsonify(sample_response)

if __name__ == '__main__':
    print("Starting CMLens ETL Backend...")
    print("Available endpoints:")
    print("  GET  /health - Health check")
    print("  POST /process-agent-data - Upload files and get agent performance data")
    print("  GET  /test-format - View expected response format")
    print()
    print("Expected file upload keys:")
    print("  - classConsumption: Class Consumption report")
    print("  - fixed: Fixed report")  
    print("  - referral: Referral report")
    print("  - upgrade: Upgrade report")
    print()
    
    # Run in debug mode for development  
    app.run(debug=True, host='0.0.0.0', port=8080)