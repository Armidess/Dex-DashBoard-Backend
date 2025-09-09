import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = 3001;
const CACHE_DURATION = 30000; 

app.use(cors());

const cache = new Map();
let cacheTimestamp = 0;

const allowedChains = ['ethereum'];

const isValidContractAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};


app.get('/api/token/:chain/:contractAddress', async (req, res) => {
    console.log("Request received:", req.params);
    const { chain, contractAddress } = req.params;
    const cacheKey = `${chain}-${contractAddress}`;

    if (!allowedChains.includes(chain.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid blockchain chain' });
    }
    if (!isValidContractAddress(contractAddress)) {
        return res.status(400).json({ error: 'Invalid contract address format' });
    }

    if (Date.now() - cacheTimestamp < CACHE_DURATION && cache.has(cacheKey)) {
        return res.json(cache.get(cacheKey));
    }

    try {
        const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${chain}/${contractAddress}`);
        if (!dexResponse.ok) {
        return res.status(502).json({ error: 'Failed to fetch data from Dexscreener API' });
        }
        const dexData = await dexResponse.json();
        const pair = dexData.pairs[0];  

        const priceUsd = pair.priceUsd;                      
        const priceChange24h = pair.priceChange.h24;        
        const volume24h = pair.volume.h24;                   
        const pairLink = pair.url;                           
        const liquidityUsd = pair.liquidity.usd;             
        const marketCap = pair.marketCap;                    

        const responseData = {
            priceUsd,
            priceChange24h,
            volume24h,
            pairLink,
            liquidityUsd,
            marketCap,
            baseToken: pair.baseToken,
            quoteToken: pair.quoteToken
        };
        cache.set(cacheKey, responseData);
        // cache.set(cacheKey, dexData);
        cacheTimestamp = Date.now();
        
        console.log("Response Data \n",responseData)    
        return res.json(responseData);
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/test', (req, res) => {
  res.send('Backend Server is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
