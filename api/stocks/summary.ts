module.exports = async function handler(req, res) {
  console.log('Stocks summary handler called:', {
    method: req.method,
    headers: req.headers
  });

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  // 실제 API 서버로 프록시
  try {
    console.log('Making request to manage-uwellnow.com/api/stocks/summary');
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Authorization 헤더가 있으면 추가
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const response = await fetch('https://manage-uwellnow.com/api/stocks/summary', {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    console.log('Response received:', {
      status: response.status,
      statusText: response.statusText
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
