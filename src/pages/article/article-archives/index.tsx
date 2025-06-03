import ArchivedArticleList from '@/components/article/ArchivedArticleList';
import ArticleList from '@/components/article/ArticleMain';
import React from 'react';

export default function ArticlePage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-8">
      <ArchivedArticleList />
    </div>
  );
}
