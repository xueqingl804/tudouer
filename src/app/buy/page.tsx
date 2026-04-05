'use client';

import Link from 'next/link';

export default function BuyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">图豆儿</h1>
        <p className="text-sm text-gray-500 mb-8">拼豆底稿生成器</p>

        <div className="bg-blue-50 rounded-xl p-5 mb-6 text-left text-sm text-gray-700 space-y-2">
          <p className="font-semibold text-gray-800">如何购买下载次数？</p>
          <p>📌 在<strong>闲鱼 / 小红书 / 抖音</strong>搜索「图豆儿」找到我们</p>
          <p>💬 下单后客服会在对话框发送一条专属激活链接</p>
          <p>🔑 点开链接，一键生成密钥，在下载时输入即可</p>
        </div>

        <Link
          href="/"
          className="inline-block w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md"
        >
          返回主页开始制作
        </Link>
      </div>
    </div>
  );
}
