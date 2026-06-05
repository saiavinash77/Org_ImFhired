import os

file_path = r"c:\Users\sai avinash\OneDrive\Desktop\All-Vibecoded-Projects\hireai\-AI-Interviewer-Skill-Assessment-Platform\backend\app\api\v1\endpoints\profiles.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
if "from app.services.s3_utils import generate_presigned_url_if_s3, get_s3_client" not in content:
    content = content.replace(
        "from app.services.s3_utils import generate_presigned_url_if_s3",
        "from app.services.s3_utils import generate_presigned_url_if_s3, get_s3_client"
    )

# 2. Update boto3 client calls
old_client = """        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )"""
new_client = "        s3 = get_s3_client()"

content = content.replace(old_client, new_client)

# 3. Update URL generation
old_url = 'return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"'
new_url = 'region = settings.AWS_S3_REGION or settings.AWS_REGION\n        return f"https://{settings.AWS_S3_BUCKET}.s3.{region}.amazonaws.com/{key}"'

content = content.replace(old_url, new_url)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully patched profiles.py")
