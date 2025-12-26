// 配置常量
const CONFIG = {
    // BOL 代币合约地址
    TOKEN_ADDRESS: "0x44444e15232ff6dfed49b550d672707a283b3910",
    // NFT 合约地址 (也是解锁和转移的逻辑合约)
    NFT_ADDRESS: "0x813608404Bb2D438D09A7419617D76A7dfFEf64E",
    // BSC 网络 ID (十进制 56)
    CHAIN_ID: 56,
    CHAIN_HEX: "0x38"
};

// ABIs
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)"
];

const NFT_ABI = [
    // 解锁
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "heroTransferUnlock",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    // 转移
    {
        "inputs": [
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"internalType": "address", "name": "to", "type": "address"}
        ],
        "name": "heroTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// 状态变量
let provider;
let signer;
let userAddress;

// UI 元素
const ui = {
    connectBtn: document.getElementById('connectWalletBtn'),
    walletInfo: document.getElementById('wallet-info'),
    userAddressSpan: document.getElementById('userAddress'),
    
    approveBtn: document.getElementById('approveBtn'),
    approveAmount: document.getElementById('approveAmount'),
    
    unlockBtn: document.getElementById('unlockBtn'),
    unlockTokenId: document.getElementById('unlockTokenId'),
    
    transferBtn: document.getElementById('transferBtn'),
    transferTokenId: document.getElementById('transferTokenId'),
    transferTo: document.getElementById('transferToAddress'),
    
    log: document.getElementById('status-log'),
    
    // 模态框元素
    walletModal: document.getElementById('walletModal'),
    closeModal: document.querySelector('.close-modal'),
    walletOptions: document.querySelectorAll('.wallet-option'),

    // 信息展示
    bolBalanceSpan: document.getElementById('bolBalance'),
    currentAllowanceSpan: document.getElementById('currentAllowance')
};

// 工具函数：显示日志
function log(msg, type = 'normal') {
    ui.log.innerHTML = msg;
    ui.log.className = 'status-log';
    if (type === 'success') ui.log.classList.add('log-success');
    if (type === 'error') ui.log.classList.add('log-error');
    if (type === 'loading') ui.log.classList.add('log-loading');
    console.log(`[${type.toUpperCase()}] ${msg}`);
}

// 初始化
async function init() {
    ui.connectBtn.addEventListener('click', openWalletModal);
    ui.closeModal.addEventListener('click', closeWalletModal);
    
    // 点击模态框背景关闭
    window.addEventListener('click', (e) => {
        if (e.target === ui.walletModal) closeWalletModal();
    });

    // 绑定钱包选择事件
    ui.walletOptions.forEach(option => {
        option.addEventListener('click', () => {
            const walletType = option.getAttribute('data-wallet');
            connectSpecificWallet(walletType);
        });
    });

    ui.approveBtn.addEventListener('click', handleApprove);
    ui.unlockBtn.addEventListener('click', handleUnlock);
    ui.transferBtn.addEventListener('click', handleTransfer);
}

// 打开钱包选择模态框
function openWalletModal() {
    ui.walletModal.classList.remove('hidden');
}

// 关闭钱包选择模态框
function closeWalletModal() {
    ui.walletModal.classList.add('hidden');
}

// 获取特定的 Provider 对象
function getProviderObject(type) {
    switch (type) {
        case 'metamask':
            // 优先检查 isMetaMask，但很多钱包也会伪装成 MetaMask
            if (window.ethereum) return window.ethereum;
            break;
        case 'okx':
            // OKX Wallet 注入对象
            if (window.okxwallet) return window.okxwallet;
            if (window.ethereum && window.ethereum.isOkxWallet) return window.ethereum;
            break;
        default:
            return window.ethereum;
    }
    return null;
}

// 连接特定钱包
async function connectSpecificWallet(walletType) {
    closeWalletModal();
    
    const providerObj = getProviderObject(walletType);
    
    if (!providerObj) {
        log(`未检测到 ${walletType} 钱包，请确保已安装插件`, "error");
        // 如果是特定钱包未找到，可以尝试回退到通用 window.ethereum 并提示
        if (walletType !== 'metamask' && window.ethereum) {
            log(`未找到特定注入对象，尝试使用通用连接...`, "loading");
            // 稍微延迟一下再尝试通用连接
            setTimeout(() => connectWithProvider(window.ethereum), 1000);
            return;
        }
        return;
    }

    await connectWithProvider(providerObj);
}

// 使用指定的 Provider 对象连接
async function connectWithProvider(providerObj) {
    try {
        log("正在连接钱包...", "loading");
        
        // 使用 BrowserProvider 包装注入的对象
        provider = new ethers.BrowserProvider(providerObj);
        
        // 请求账号访问
        const accounts = await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        
        // 检查网络
        const network = await provider.getNetwork();
        if (network.chainId !== BigInt(CONFIG.CHAIN_ID)) {
            try {
                await provider.send('wallet_switchEthereumChain', [{ chainId: CONFIG.CHAIN_HEX }]);
                // 切换网络后，建议重新获取 signer
                signer = await provider.getSigner();
            } catch (switchError) {
                // 如果是 4902 错误 (Unrecognized chain ID)，则尝试添加网络
                if (switchError.code === 4902 || switchError.error?.code === 4902) {
                    try {
                        await provider.send('wallet_addEthereumChain', [{
                            chainId: CONFIG.CHAIN_HEX,
                            chainName: 'Binance Smart Chain',
                            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                            rpcUrls: ['https://bsc-dataseed.binance.org/'],
                            blockExplorerUrls: ['https://bscscan.com/']
                        }]);
                        signer = await provider.getSigner();
                    } catch (addError) {
                         log("添加 BSC 网络失败，请手动切换", "error");
                         return;
                    }
                } else {
                    log("请切换到 BSC (Binance Smart Chain) 网络", "error");
                    return;
                }
            }
        }

        // 更新 UI
        ui.userAddressSpan.textContent = `${userAddress.substring(0,6)}...${userAddress.substring(38)}`;
        ui.walletInfo.classList.remove('hidden');
        ui.connectBtn.textContent = "已连接";
        ui.connectBtn.disabled = true;
        
        // 启用操作按钮
        ui.approveBtn.disabled = false;
        ui.unlockBtn.disabled = false;
        ui.transferBtn.disabled = false;
        
        log("钱包连接成功", "success");

        // 连接成功后，立即检查余额和授权
        await checkAllowanceAndBalance();
        
    } catch (error) {
        console.error(error);
        log(`连接失败: ${error.message || "用户取消或发生错误"}`, "error");
    }
}

// 检查余额和授权额度
async function checkAllowanceAndBalance() {
    if (!signer || !userAddress) return;

    try {
        const tokenContract = new ethers.Contract(CONFIG.TOKEN_ADDRESS, ERC20_ABI, signer);
        const decimals = await tokenContract.decimals();

        // 并行请求
        const [balance, allowance] = await Promise.all([
            tokenContract.balanceOf(userAddress),
            tokenContract.allowance(userAddress, CONFIG.NFT_ADDRESS)
        ]);

        const fmtBalance = ethers.formatUnits(balance, decimals);
        const fmtAllowance = ethers.formatUnits(allowance, decimals);

        ui.bolBalanceSpan.textContent = `余额: ${parseFloat(fmtBalance).toFixed(2)} BOL`;
        ui.currentAllowanceSpan.textContent = `已授权: ${parseFloat(fmtAllowance).toFixed(2)} BOL`;

        return { balance, allowance, decimals }; // 返回 BigInt 原始值和 decimals
    } catch (error) {
        console.error("查询余额/授权失败:", error);
        log("查询代币状态失败，请检查网络", "error");
    }
    return null;
}

// 处理授权
async function handleApprove() {
    console.log("点击了授权按钮");
    if (!signer) {
        log("钱包未连接，请先连接钱包", "error");
        return;
    }
    
    const amountVal = ui.approveAmount.value;
    if (!amountVal || amountVal <= 0) {
        log("请输入有效的授权数量", "error");
        return;
    }

    try {
        log("正在请求授权...", "loading");
        ui.approveBtn.disabled = true;
        ui.approveBtn.textContent = "处理中...";

        const tokenContract = new ethers.Contract(CONFIG.TOKEN_ADDRESS, ERC20_ABI, signer);
        const decimals = await tokenContract.decimals(); // 通常是 18
        const amountWei = ethers.parseUnits(amountVal.toString(), decimals);

        const tx = await tokenContract.approve(CONFIG.NFT_ADDRESS, amountWei);
        log(`授权交易已发送: ${tx.hash} <br> 等待确认...`, "loading");

        const receipt = await tx.wait();
        if (receipt.status === 1) {
            log(`授权成功! 交易哈希: ${tx.hash}`, "success");
            // 授权成功后刷新状态
            await checkAllowanceAndBalance();
        } else {
             throw new Error("授权交易执行失败 (Reverted)");
        }
        
    } catch (error) {
        console.error("授权错误:", error);
        let errorMsg = error.reason || error.message || "未知错误";
        log(`授权失败: ${errorMsg}`, "error");
        alert(`授权失败: ${errorMsg}`);
    } finally {
        ui.approveBtn.disabled = false;
        ui.approveBtn.textContent = "授权代币";
    }
}

// 处理解锁
async function handleUnlock() {
    console.log("点击了解锁按钮");
    if (!signer) {
        log("钱包未连接或 Signer 丢失，请重新连接", "error");
        return;
    }
    
    const tokenIdVal = ui.unlockTokenId.value;
    if (!tokenIdVal) {
        log("请输入 Token ID", "error");
        return;
    }

    // 预检查：授权额度
    try {
        log("正在检查授权额度...", "loading");
        const status = await checkAllowanceAndBalance();
        if (status) {
            // 简单估算，如果授权额度接近 0，则提示
            // 实际上应该判断是否 >= 20000 (或者用户输入的数量)
            // 这里我们判断如果 < 10000 就警告（基于用户说消耗9000）
            const minRequired = ethers.parseUnits("10000", status.decimals);
            if (status.allowance < minRequired) {
                const confirmMsg = `当前授权额度 (${ethers.formatUnits(status.allowance, status.decimals)} BOL) 可能不足以支付解锁费用 (约 9000 BOL)。\n\n继续尝试解锁可能会失败。\n\n建议先去执行步骤 1 进行授权。是否强行继续？`;
                if (!confirm(confirmMsg)) {
                    log("已取消解锁，请先授权", "normal");
                    return;
                }
            }
        }
    } catch (checkErr) {
        console.warn("预检查失败，忽略", checkErr);
    }

    try {
        log(`正在请求解锁 Token ID: ${tokenIdVal}...`, "loading");
        ui.unlockBtn.disabled = true;
        ui.unlockBtn.textContent = "处理中...";

        const nftContract = new ethers.Contract(CONFIG.NFT_ADDRESS, NFT_ABI, signer);
        
        // 检查方法是否存在
        if (typeof nftContract.heroTransferUnlock !== 'function') {
            throw new Error("合约中未找到 heroTransferUnlock 方法，请检查 ABI 配置");
        }

        // 强制转换为 BigInt 或者是字符串
        // ethers v6 处理字符串数字通常没问题，但明确一点更好
        const tx = await nftContract.heroTransferUnlock(tokenIdVal);
        log(`解锁交易已发送: ${tx.hash} <br> 等待确认...`, "loading");

        const receipt = await tx.wait();
        if (receipt.status === 1) {
            log(`解锁成功! Token ID: ${tokenIdVal}`, "success");
            // 自动填充转移输入框方便下一步
            ui.transferTokenId.value = tokenIdVal;
            // 刷新余额
            await checkAllowanceAndBalance();
        } else {
            throw new Error("交易执行失败 (Reverted)");
        }

    } catch (error) {
        console.error("解锁错误详细信息:", error);
        let errorMsg = error.reason || error.message || "未知错误";
        if (error.code === 'ACTION_REJECTED') {
            errorMsg = "用户拒绝了交易签名";
        } else if (error.data) {
             errorMsg += ` (Data: ${error.data})`;
        }
        
        // 针对 ERC20: insufficient allowance 特殊提示
        if (errorMsg.includes("insufficient allowance")) {
            errorMsg += "\n\n原因：授权额度不足！请先执行步骤 1 进行授权。";
        }

        log(`解锁失败: ${errorMsg}`, "error");
        alert(`解锁失败: ${errorMsg}`); // 强制弹窗提示
    } finally {
        ui.unlockBtn.disabled = false;
        ui.unlockBtn.textContent = "解锁 NFT";
    }
}

// 处理转移
async function handleTransfer() {
    console.log("点击了转移按钮");
    if (!signer) {
        log("钱包未连接", "error");
        return;
    }
    
    const tokenIdVal = ui.transferTokenId.value;
    const toAddr = ui.transferTo.value;

    if (!tokenIdVal) {
        log("请输入 Token ID", "error");
        return;
    }
    if (!ethers.isAddress(toAddr)) {
        log("请输入有效的接收地址", "error");
        return;
    }

    try {
        log(`正在请求转移 Token ID: ${tokenIdVal} 到 ${toAddr}...`, "loading");
        ui.transferBtn.disabled = true;
        ui.transferBtn.textContent = "处理中...";

        const nftContract = new ethers.Contract(CONFIG.NFT_ADDRESS, NFT_ABI, signer);
        
        // 检查方法是否存在
        if (typeof nftContract.heroTransfer !== 'function') {
            throw new Error("合约中未找到 heroTransfer 方法，请检查 ABI 配置");
        }

        const tx = await nftContract.heroTransfer(tokenIdVal, toAddr);
        log(`转移交易已发送: ${tx.hash} <br> 等待确认...`, "loading");

        const receipt = await tx.wait();
        if (receipt.status === 1) {
             log(`转移成功! Token ID: ${tokenIdVal} 已发送至 ${toAddr}`, "success");
        } else {
             throw new Error("转移交易执行失败 (Reverted)");
        }

    } catch (error) {
        console.error("转移错误:", error);
        let errorMsg = error.reason || error.message || "未知错误";
        if (error.code === 'ACTION_REJECTED') {
            errorMsg = "用户拒绝了交易签名";
        }
        log(`转移失败: ${errorMsg}`, "error");
        alert(`转移失败: ${errorMsg}`);
    } finally {
        ui.transferBtn.disabled = false;
        ui.transferBtn.textContent = "转移 NFT";
    }
}

// 启动
window.addEventListener('DOMContentLoaded', init);