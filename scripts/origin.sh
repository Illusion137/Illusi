set -o errexit

echo "Validating lib-origin..."
cd ../lib-origin
sh build.sh
cd ../mobile

# echo "Commiting lib-origin to dev..."

echo "Pulling from origin..."
origin.out