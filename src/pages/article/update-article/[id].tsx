import ArticleDetails from '@/components/article/ArticleDetails';
import ArticleList from '@/components/article/ArticleMain';
import ArticleEdit from '@/components/article/UpdateArticle';

import React from 'react';

export default function ArticlePage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-8">
      <ArticleEdit />
    </div>
  );
}
