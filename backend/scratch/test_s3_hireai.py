import boto3
import os
from dotenv import load_dotenv

load_dotenv()

access_key = os.getenv("AWS_ACCESS_KEY_ID")
secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
# Testing the old bucket name found in DB
bucket_name = "hireai-uploads-prod"
region = "us-east-1"

print(f"Testing S3 Connection...")
print(f"Bucket: {bucket_name}")
print(f"Region: {region}")

try:
    s3 = boto3.client(
        "s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region
    )
    
    # 1. Check bucket location
    location = s3.get_bucket_location(Bucket=bucket_name)
    actual_region = location.get('LocationConstraint') or 'us-east-1'
    print(f"Actual Bucket Region: {actual_region}")
    
    # 2. List some objects
    response = s3.list_objects_v2(Bucket=bucket_name, MaxKeys=5)
    print(f"Connection Successful! Objects in bucket:")
    if 'Contents' in response:
        for obj in response['Contents']:
            print(f" - {obj['Key']}")
    else:
        print(" (Bucket is empty)")

except Exception as e:
    print(f"Error: {e}")
