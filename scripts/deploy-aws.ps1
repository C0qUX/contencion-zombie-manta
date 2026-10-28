param([string]$StackName = 'contencion-zombie-manta', [string]$Region = 'us-east-1')
$ErrorActionPreference = 'Stop'

npm ci
npm run build
aws cloudformation deploy --template-file infra/template.yaml --stack-name $StackName --region $Region
$bucket = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text
$distribution = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text
aws s3 sync dist "s3://$bucket" --delete
aws cloudfront create-invalidation --distribution-id $distribution --paths '/*'
aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='SiteUrl'].OutputValue" --output text
