<?php
/**
 * AIF Chat - 数据库种子脚本
 * 
 * 创建初始管理员和测试用户。
 * 在服务器上运行：php seed.php
 * 或在宝塔面板的「终端」中运行。
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/auth.php';

echo "=== AIF Chat 种子数据初始化 ===\n\n";

$db = db();

// ====================== 创建管理员用户 ======================
$adminUsername = 'admin';
$adminEmail = 'admin@aifchat.local';
$adminPassword = 'admin888';
$stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
$stmt->execute([$adminUsername]);
if (!$stmt->fetch()) {
    $hashed = password_hash($adminPassword, PASSWORD_BCRYPT);
    $stmt = $db->prepare(
        'INSERT INTO users (username, nickname, email, password, role, status, tokens_limit, tokens_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$adminUsername, '管理员', $adminEmail, $hashed, 'admin', 'active', 99999999, 99999999]);
    echo "✅ 管理员账号创建成功\n";
    echo "   用户名: {$adminUsername}\n";
    echo "   密码:   {$adminPassword}\n";
} else {
    echo "⏭️  管理员账号已存在，跳过\n";
}

// 签发一个管理员的长期 access token（方便 curl 测试）
$stmt = $db->prepare('SELECT id, username FROM users WHERE username = ?');
$stmt->execute([$adminUsername]);
$admin = $stmt->fetch();
if ($admin) {
    $adminToken = issueAccessToken((int)$admin['id'], $admin['username']);
    echo "\n📋 管理员 Access Token（可用于 curl 测试）：\n";
    echo "   {$adminToken}\n";
    echo "\n   curl 测试示例：\n";
    echo '   curl -H "Authorization: Bearer ' . $adminToken . '" "https://api.aifmusic.top/app_api.php?action=me"' . "\n";
}

// ====================== 创建测试用户 ======================
$testUsername = 'test';
$testEmail = 'test@aifchat.local';
$testPassword = 'test8888';
$stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
$stmt->execute([$testUsername]);
if (!$stmt->fetch()) {
    $hashed = password_hash($testPassword, PASSWORD_BCRYPT);
    $stmt = $db->prepare(
        'INSERT INTO users (username, nickname, email, password, role, status, tokens_limit, tokens_remaining) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$testUsername, '测试用户', $testEmail, $hashed, 'user', 'active', 1000000, 1000000]);
    echo "\n✅ 测试账号创建成功\n";
    echo "   用户名: {$testUsername}\n";
    echo "   密码:   {$testPassword}\n";
} else {
    echo "\n⏭️  测试账号已存在，跳过\n";
}

// ====================== 查看已有用户 ======================
echo "\n";
echo "=== 当前用户列表 ===\n";
$stmt = $db->query('SELECT id, username, nickname, role, status, tokens_remaining FROM users ORDER BY id');
$users = $stmt->fetchAll();
if (count($users) === 0) {
    echo "（数据库中没有用户）\n";
} else {
    printf("%-5s %-20s %-20s %-10s %-10s %s\n", 'ID', '用户名', '昵称', '角色', '状态', 'Token 余额');
    echo str_repeat('-', 90) . "\n";
    foreach ($users as $u) {
        printf("%-5d %-20s %-20s %-10s %-10s %s\n",
            $u['id'], $u['username'], $u['nickname'], $u['role'], $u['status'], number_format((int)$u['tokens_remaining']));
    }
}

echo "\n=== 完成 ===\n";
echo "💡 提示：SMTP 配置后请在 .env 中设置 SMTP_* 参数，否则注册时验证码将以调试模式返回。\n";
