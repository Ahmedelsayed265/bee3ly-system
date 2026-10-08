import assert from 'node:assert/strict';
import test from 'node:test';
import { helpArticles } from './articles.ts';
import { filterArticles } from './filter-articles.ts';

test('empty search returns every article', () => {
  assert.equal(filterArticles(helpArticles, '   ').length, helpArticles.length);
});

test('search matches title and keywords', () => {
  const byTitle = filterArticles(helpArticles, 'واتساب');
  assert.ok(byTitle.some((article) => article.slug === 'connect-whatsapp'));
  const byKeyword = filterArticles(helpArticles, 'act');
  assert.ok(byKeyword.some((article) => article.slug === 'create-ad-account'));
});

test('unknown word returns nothing', () => {
  assert.deepEqual(filterArticles(helpArticles, 'xyzzy-no-such-topic'), []);
});
