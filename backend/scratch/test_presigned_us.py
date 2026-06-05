import boto3
import os
from dotenv import load_dotenv

load_dotenv()

access_key = os.getenv("AWS_ACCESS_KEY_ID")
secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
bucket_name = "hireai-uploads-prod"
region = "us-east-1" # Trying us-east-1 to see if it works

s3 = boto3.client(
    "s3",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name=region
)

key = "profiles/061bebef-c13a-477f-bd77-24b5e2914446/e63e9a6b-592f-40ea-824f-7cffaafcd2f1.pdf"

url = s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": bucket_name, "Key": key},
    ExpiresIn=3600
)

print(f"Presigned URL (us-east-1):")
print(url)
