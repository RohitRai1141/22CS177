import React, { useState, useEffect } from 'react';

const log = async (level, message) => {
  try {
    await fetch('http://20.244.56.144/evaluation-service/logs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJyb2hpdHJhaS4yNmNzYkBsaWNldC5hYy5pbiIsImV4cCI6MTc1NjE5OTY2NywiaWF0IjoxNzU2MTk4NzY3LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNWI3YzFlNWYtOTQwNi00MjU5LWE4YzEtMWUxNzA1MmIyMWEyIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoicm9oaXRyYWkiLCJzdWIiOiI2NWQ5ZDMwNC01OTUyLTQ4ZGItOTg0Zi1hZDFkYTljNDIzMGUifSwiZW1haWwiOiJyb2hpdHJhaS4yNmNzYkBsaWNldC5hYy5pbiIsIm5hbWUiOiJyb2hpdHJhaSIsInJvbGxObyI6IjIyY3MxNzciLCJhY2Nlc3NDb2RlIjoiWUNWc1N5IiwiY2xpZW50SUQiOiI2NWQ5ZDMwNC01OTUyLTQ4ZGItOTg0Zi1hZDFkYTljNDIzMGUiLCJjbGllbnRTZWNyZXQiOiJUZVJORVVTcUNzalJZWVN3In0.C-Aa9U4zkCed_JUH-ODukuxXhIGLdHaz-9dk1IsZC6Q',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stack: 'frontend',
        level,
        package: 'react',
        message
      })
    });
  } catch (error) {
    console.error('Logging failed:', error);
  }
};

const UrlShortenerPage = ({ onUrlsCreated }) => {
  const [urls, setUrls] = useState([{ url: '', validity: 30, shortcode: '' }]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addUrlField = () => {
    if (urls.length < 5) {
      setUrls([...urls, { url: '', validity: 30, shortcode: '' }]);
      log('info', 'Added new URL field');
    }
  };

  const removeUrlField = (index) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
      log('info', `Removed URL field at index ${index}`);
    }
  };

  const updateUrl = (index, field, value) => {
    const newUrls = [...urls];
    newUrls[index][field] = value;
    setUrls(newUrls);
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateInputs = () => {
    for (let i = 0; i < urls.length; i++) {
      const { url, validity, shortcode } = urls[i];
      
      if (!url.trim()) {
        alert(`URL ${i + 1} is required`);
        return false;
      }
      
      if (!isValidUrl(url)) {
        alert(`URL ${i + 1} is not valid`);
        return false;
      }
      
      if (validity && (!Number.isInteger(Number(validity)) || Number(validity) <= 0)) {
        alert(`Validity for URL ${i + 1} must be a positive integer`);
        return false;
      }
      
      if (shortcode && !/^[a-zA-Z0-9]+$/.test(shortcode)) {
        alert(`Shortcode for URL ${i + 1} must be alphanumeric`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateInputs()) {
      log('warn', 'Form validation failed');
      return;
    }

    setLoading(true);
    setResults([]);
    
    log('info', `Creating ${urls.length} short URLs`);

    try {
      const promises = urls.map(async (urlData) => {
        const response = await fetch('http://localhost:5000/shorturls', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: urlData.url,
            validity: Number(urlData.validity),
            shortcode: urlData.shortcode || undefined
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create short URL');
        }

        return {
          original: urlData.url,
          shortLink: result.shortLink,
          expiry: result.expiry,
          success: true
        };
      });

      const results = await Promise.allSettled(promises);
      const processedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            original: urls[index].url,
            error: result.reason.message,
            success: false
          };
        }
      });

      setResults(processedResults);
      
      const successCount = processedResults.filter(r => r.success).length;
      log('info', `Successfully created ${successCount} out of ${urls.length} short URLs`);
      
      if (onUrlsCreated) {
        onUrlsCreated();
      }

    } catch (error) {
      log('error', `Error creating short URLs: ${error.message}`);
      alert('An error occurred while creating short URLs');
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>URL Shortener</h2>
      
      <form onSubmit={handleSubmit}>
        {urls.map((urlData, index) => (
          <div key={index} style={{ 
            border: '1px solid #ddd', 
            padding: '15px', 
            marginBottom: '15px', 
            borderRadius: '5px' 
          }}>
            <h4>URL {index + 1}</h4>
            
            <div style={{ marginBottom: '10px' }}>
              <label>URL *</label>
              <input
                type="url"
                value={urlData.url}
                onChange={(e) => updateUrl(index, 'url', e.target.value)}
                placeholder="https://example.com"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Validity (minutes)</label>
              <input
                type="number"
                value={urlData.validity}
                onChange={(e) => updateUrl(index, 'validity', e.target.value)}
                min="1"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Custom Shortcode (optional)</label>
              <input
                type="text"
                value={urlData.shortcode}
                onChange={(e) => updateUrl(index, 'shortcode', e.target.value)}
                placeholder="abc123"
                pattern="[a-zA-Z0-9]+"
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  marginTop: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              />
            </div>
            
            {urls.length > 1 && (
              <button
                type="button"
                onClick={() => removeUrlField(index)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        
        <div style={{ marginBottom: '20px' }}>
          {urls.length < 5 && (
            <button
              type="button"
              onClick={addUrlField}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '3px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Add Another URL
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '3px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating...' : 'Create Short URLs'}
          </button>
        </div>
      </form>
      
      {results.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Results</h3>
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                border: `1px solid ${result.success ? '#28a745' : '#dc3545'}`,
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '5px',
                backgroundColor: result.success ? '#d4edda' : '#f8d7da'
              }}
            >
              <p><strong>Original:</strong> {result.original}</p>
              {result.success ? (
                <>
                  <p><strong>Short URL:</strong> <a href={result.shortLink} target="_blank" rel="noopener noreferrer">{result.shortLink}</a></p>
                  <p><strong>Expires:</strong> {new Date(result.expiry).toLocaleString()}</p>
                </>
              ) : (
                <p style={{ color: '#721c24' }}><strong>Error:</strong> {result.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatisticsPage = () => {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchUrls();
    log('info', 'Statistics page loaded');
  }, []);

  const fetchUrls = async () => {
    try {
      const response = await fetch('http://localhost:5000/shorturls');
      if (response.ok) {
        const data = await response.json();
        setUrls(data);
        log('info', `Loaded ${data.length} URLs in statistics`);
      } else {
        log('error', 'Failed to fetch URLs for statistics');
      }
    } catch (error) {
      log('error', `Error fetching URLs: ${error.message}`);
    }
    setLoading(false);
  };

  const fetchStats = async (shortcode) => {
    try {
      const response = await fetch(`http://localhost:5000/shorturls/${shortcode}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        log('info', `Loaded stats for ${shortcode}: ${data.totalClicks} clicks`);
      } else {
        log('error', `Failed to fetch stats for ${shortcode}`);
        alert('Failed to load statistics');
      }
    } catch (error) {
      log('error', `Error fetching stats: ${error.message}`);
      alert('Error loading statistics');
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading statistics...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>URL Statistics</h2>
      
      {urls.length === 0 ? (
        <p>No URLs created yet.</p>
      ) : (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Short URL</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Original URL</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Created</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Expires</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Clicks</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((url) => (
                <tr key={url.shortcode}>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                    <a href={url.shortLink} target="_blank" rel="noopener noreferrer">
                      {url.shortLink}
                    </a>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', maxWidth: '200px', wordBreak: 'break-all' }}>
                    {url.originalUrl}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                    {new Date(url.createdAt).toLocaleString()}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                    {new Date(url.expiry).toLocaleString()}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                    {url.totalClicks}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                    <span style={{ 
                      color: url.isExpired ? '#dc3545' : '#28a745',
                      fontWeight: 'bold'
                    }}>
                      {url.isExpired ? 'Expired' : 'Active'}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                    <button
                      onClick={() => {
                        setSelectedUrl(url);
                        fetchStats(url.shortcode);
                      }}
                      style={{
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {selectedUrl && stats && (
            <div style={{ 
              border: '1px solid #ddd', 
              padding: '20px', 
              borderRadius: '5px',
              backgroundColor: '#f8f9fa'
            }}>
              <h3>Detailed Statistics for {selectedUrl.shortLink}</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <p><strong>Original URL:</strong> {stats.originalUrl}</p>
                <p><strong>Created:</strong> {new Date(stats.createdAt).toLocaleString()}</p>
                <p><strong>Expires:</strong> {new Date(stats.expiry).toLocaleString()}</p>
                <p><strong>Total Clicks:</strong> {stats.totalClicks}</p>
              </div>

              {stats.clicks && stats.clicks.length > 0 && (
                <div>
                  <h4>Click History</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#e9ecef' }}>
                          <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Timestamp</th>
                          <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Referrer</th>
                          <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>User Agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.clicks.map((click, index) => (
                          <tr key={index}>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                              {new Date(click.timestamp).toLocaleString()}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                              {click.referrer}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '8px', maxWidth: '200px', wordBreak: 'break-all' }}>
                              {click.userAgent}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedUrl(null);
                  setStats(null);
                }}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  marginTop: '15px'
                }}
              >
                Close Details
              </button>
            </div>
          )}
        </div>
      )}
      
      <button
        onClick={fetchUrls}
        style={{
          background: '#28a745',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '3px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Refresh Data
      </button>
    </div>
  );
};

const App = () => {
  const [currentPage, setCurrentPage] = useState('shortener');
  const [refreshStats, setRefreshStats] = useState(0);

  const handleUrlsCreated = () => {
    setRefreshStats(prev => prev + 1);
  };

  return (
    <div>
      <nav style={{ 
        background: '#343a40', 
        padding: '15px', 
        marginBottom: '20px' 
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <h1 style={{ color: 'white', margin: '0', marginRight: '30px' }}>URL Shortener</h1>
          <div>
            <button
              onClick={() => setCurrentPage('shortener')}
              style={{
                background: currentPage === 'shortener' ? '#007bff' : 'transparent',
                color: 'white',
                border: '1px solid #007bff',
                padding: '8px 15px',
                borderRadius: '3px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Create Short URLs
            </button>
            <button
              onClick={() => setCurrentPage('stats')}
              style={{
                background: currentPage === 'stats' ? '#007bff' : 'transparent',
                color: 'white',
                border: '1px solid #007bff',
                padding: '8px 15px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Statistics
            </button>
          </div>
        </div>
      </nav>

      {currentPage === 'shortener' && <UrlShortenerPage onUrlsCreated={handleUrlsCreated} />}
      {currentPage === 'stats' && <StatisticsPage key={refreshStats} />}
    </div>
  );
};

export default App;