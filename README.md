# BOL NFT 管理工具 (Unlock & Transfer)

这是一个专为 BOL NFT 设计的 Web 管理工具，旨在简化 NFT 的解锁与转移流程。该项目基于 BSC (Binance Smart Chain) 网络，提供了一个直观、美观的暗黑风格界面，允许用户通过简单的三步操作完成 NFT 的解锁和资产转移。

## 🌟 功能特性

*   **多钱包支持**：
    *   **MetaMask**：标准连接。
    *   **OKX Wallet**：优先识别 OKX 注入对象，支持多链钱包。
*   **智能状态监控**：
    *   实时显示用户 **BOL 代币余额**。
    *   实时显示当前对 NFT 合约的 **授权额度 (Allowance)**。
*   **三步操作流程**：
    1.  **授权代币 (Approve)**：一键授权 NFT 合约使用 BOL 代币（解锁需消耗代币）。
    2.  **解锁 NFT (Unlock)**：调用 `heroTransferUnlock` 合约方法解锁指定 Token ID 的 NFT。
        *   *内置安全检查*：在解锁前自动检测授权额度，防止因额度不足导致的 Gas 浪费和交易失败。
    3.  **转移 NFT (Transfer)**：将解锁后的 NFT 发送到指定目标地址。
*   **用户体验优化**：
    *   暗色游戏风格 UI，搭配毛玻璃 (Glassmorphism) 效果。
    *   详细的交易日志与状态提示（Loading/Success/Error）。
    *   关键错误（如用户拒绝签名、额度不足）强制弹窗提醒。
    *   自动填充：解锁成功后自动填入 Token ID 到转移表单。

## 🛠️ 技术栈

*   **前端核心**：原生 HTML5 / CSS3 / JavaScript (ES6+)。
*   **Web3 库**：`ethers.js v6` (通过 CDN 引入，无需本地构建)。
*   **网络**：Binance Smart Chain (BSC) Mainnet (Chain ID: 56)。
*   **样式**：Flexbox 布局，响应式设计，自定义 CSS 变量。

## 🚀 快速开始

### 1. 环境准备
本项目是一个纯静态 Web 项目，您可以直接在浏览器打开，或使用任意静态服务器运行。

**方式 A：直接运行 (推荐)**
如果您安装了 Python (Mac/Windows)：
```bash
# 在项目根目录下运行
python -m http.server 8000
```
然后在浏览器访问 `http://localhost:8000`。

**方式 B：VS Code Live Server**
使用 VS Code 插件 "Live Server" 右键 `index.html` -> "Open with Live Server"。

### 2. 操作指南

1.  **连接钱包**：点击右上角“连接钱包”，选择 MetaMask 或 OKX Wallet。
2.  **检查状态**：连接成功后，观察“授权代币”区域的“余额”和“已授权”数值。
3.  **步骤 1 - 授权**：
    *   如果“已授权”显示为 0 或低于 9000 BOL，请输入授权数量（建议 20000），点击“授权代币”。
    *   并在钱包中确认交易。
4.  **步骤 2 - 解锁**：
    *   输入您的 NFT Token ID。
    *   点击“解锁 NFT”。如果额度充足，钱包会弹出签名请求。
5.  **步骤 3 - 转移**：
    *   解锁成功后，Token ID 会自动填充到步骤 3。
    *   输入接收方地址，点击“转移 NFT”。

## 📁 文件结构

```
.
├── index.html      # 页面结构与 UI 布局
├── style.css       # 样式定义 (暗黑主题、动画、响应式)
├── script.js       # 核心逻辑 (Ethers.js 交互、状态管理、错误处理)
└── README.md       # 项目说明文档
```

## ⚠️ 注意事项

*   **网络要求**：请确保钱包已切换至 **BSC (Binance Smart Chain)** 主网。
*   **代币消耗**：解锁 NFT 需要扣除约 6U 的 BOL 代币（具体数量由合约决定），请确保余额充足。
*   **安全性**：本项目仅前端代码，不存储任何私钥。所有交易均需通过您的钱包插件确认。

## 🤝 贡献
欢迎提交 Issue 或 Pull Request 来改进 UI 或增加新功能。
