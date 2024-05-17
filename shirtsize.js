const fs = require('fs/promises');

const shirtMatcher = {
  '4XL': ['4x', 'xxxxl'],
  '3XL': ['3x', 'xxxl'],
  '2XL': ['2x', 'xxl'],
  'XL': ['extra large', 'xlarge'],
  'L': ['large'],
  'M': ['medium'],
  'S': ['small'],
  'XS': ['extra small', 'x-small'],
};

(async () => {
  const shirts = (await fs.readFile('./tshirts.csv', 'utf-8')).toString().split('\r\n');
  shirts.shift();

  const shirtAudit = [];
  const shirtMap = new Map();
  const errors = [];

  for (const size of Object.keys(shirtMatcher)) {
    shirtMap.set(size, 0);
  }

  for (let i = 0; i < shirts.length; i++) {
    const shirt = shirts[i];
    let [shirtSize] = Object.entries(shirtMatcher).map(([key, strMatches]) => {
      return [key, [ ...strMatches, key ].find(m => shirt.toLowerCase().includes(m.toLowerCase()))?.length || 0];
    }).filter(([, rank]) => rank !== 0).sort(([, rankA], [, rankB]) => rankB - rankA)[0] || [];

    if (!shirtSize) {
       errors.push(`Row #${i + 2}: NO SHIRT SIZE! Defaulting to L. "${shirt}"`);
       shirtSize = 'L';
    }

    shirtAudit.push([shirtSize, shirt]);

    shirtMap.set(shirtSize, shirtMap.get(shirtSize) + 1);
  }

  console.log(shirtMap.entries());
  console.log('\nErrors:\n', errors.join(' \n '));
  console.table(shirtAudit);
})();