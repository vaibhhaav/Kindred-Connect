import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./serviceAccountKey.json', 'utf8'),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = '5GNQWrm9GYZymnkqYkXvJtRfDPg2';

async function main() {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log('Admin claim set on user', uid);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});