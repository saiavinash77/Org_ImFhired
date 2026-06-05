import boto3
import os
from dotenv import load_dotenv

load_dotenv()

access_key = os.getenv("AWS_ACCESS_KEY_ID")
secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

s3 = boto3.client(
    "s3",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="us-east-1"
)

try:
    response = s3.list_buckets()
    print("Buckets in this account:")
    for bucket in response['Buckets']:
        name = bucket['Name']
        try:
            loc = s3.get_bucket_location(Bucket=name)
            region = loc.get('LocationConstraint') or 'us-east-1'
            print(f" - {name} ({region})")
        except Exception as e:
            print(f" - {name} (Error getting region: {e})")

except Exception as e:
    print(f"Error: {e}")
