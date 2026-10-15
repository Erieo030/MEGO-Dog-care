import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import { SETTINGS_PAGES } from '../settingsPages';

/** 檢查實際導航宣告，避免自製頁首外又出現系統標題，或新增子頁時漏掉頁首規劃。 */
test('all settings routes disable the native header without overriding it on a child screen', () => {
  const source = readFileSync(join(__dirname, '../../../navigation/MainTabs.tsx'), 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const profile = ast.program.body.find(
    (node) => node.type === 'FunctionDeclaration' && node.id?.name === 'ProfileStack',
  );
  if (profile?.type !== 'FunctionDeclaration') throw new Error('Missing ProfileStack');
  const returned = profile.body.body.find((node) => node.type === 'ReturnStatement');
  const navigator = returned?.argument;
  if (navigator?.type !== 'JSXElement') throw new Error('Missing settings navigator');
  const options = navigator.openingElement.attributes.find(
    (attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'screenOptions',
  );
  if (
    options?.type !== 'JSXAttribute' ||
    options.value?.type !== 'JSXExpressionContainer' ||
    options.value.expression.type !== 'ObjectExpression'
  )
    throw new Error('Missing settings navigator options');
  // The final explicit property overrides the shared native stack defaults.
  const lastOption = options.value.expression.properties.at(-1);
  expect(lastOption).toMatchObject({
    type: 'ObjectProperty',
    key: { name: 'headerShown' },
    value: { value: false },
  });
  const routes: string[] = [];
  for (const child of navigator.children) {
    if (child.type !== 'JSXElement') continue;
    for (const attribute of child.openingElement.attributes) {
      if (attribute.type !== 'JSXAttribute') continue;
      if (attribute.name.name === 'name' && attribute.value?.type === 'StringLiteral')
        routes.push(attribute.value.value);
      if (
        attribute.name.name === 'options' &&
        attribute.value?.type === 'JSXExpressionContainer' &&
        attribute.value.expression.type === 'ObjectExpression'
      ) {
        const header = attribute.value.expression.properties.find(
          (property) =>
            property.type === 'ObjectProperty' &&
            property.key.type === 'Identifier' &&
            property.key.name === 'headerShown',
        );
        if (header) expect(header).toMatchObject({ value: { value: false } });
      }
    }
  }
  expect(routes.sort()).toEqual(
    ['ProfileOverview', 'EditPet', ...Object.keys(SETTINGS_PAGES)].sort(),
  );
});
