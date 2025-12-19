// This script is designed for mobile media

// 获取汉堡菜单按钮和导航菜单
const menuToggle = document.getElementById('menuToggle');
const universalRight = document.getElementById('universalRight');

// 添加点击事件监听器到汉堡菜单按钮
menuToggle.addEventListener('click', function() {
    // 切换导航菜单的active类
    universalRight.classList.toggle('active');
});