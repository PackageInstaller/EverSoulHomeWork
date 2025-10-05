
pm2 stop npm
rm -rf .next
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client
npm install @prisma/client
npx prisma generate
npm run build
pm2 restart npm
pm2 logs
