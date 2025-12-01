const { ethers } = require('ethers');
const ABI = require('../TerraTokenABI.json');

let contract = null;

if (process.env.PRIVATE_KEY && process.env.CONTRACT_ADDRESS && process.env.RPC_URL) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);
}

exports.mint = async (wallet, amountRupiah) => {
  if (!contract) return null;

  try {
    const amountToken = ethers.parseUnits((amountRupiah / 1000).toString(), 18);
    const tx = await contract.mintReward(wallet, amountToken);
    await tx.wait(1);
    return tx.hash;
  } catch (err) {
    console.log(err);
    return null;
  }
};
