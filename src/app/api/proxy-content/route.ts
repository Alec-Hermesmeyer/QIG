import { NextRequest, NextResponse } from 'next/server';

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_SECRET = process.env.AZURE_SECRET;
const GROUNDX_API_KEY = process.env.GROUNDX_API_KEY;
const GROUNDX_API_URL = process.env.GROUNDX_API_URL || 'https://api.groundx.ai';
// Updated backend URL for Azure
const AZURE_BACKEND_URL = 'https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io';

async function getAzureToken() {
  const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: AZURE_CLIENT_ID!,
    scope: `${AZURE_CLIENT_ID}/.default`,
    client_secret: AZURE_SECRET!,
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure token request failed: ${response.status} ${response.statusText}: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source') || 'azure';

    if (source === 'groundx') {
      const documentId = searchParams.get('documentId');
      // New parameter to specify if we want the x-ray version
      const xray = searchParams.get('xray') === 'true';

      if (!documentId) {
        return NextResponse.json(
          { error: 'Bad Request', details: 'documentId is required for GroundX source' },
          { status: 400 }
        );
      }

      console.log(`Attempting to fetch document from GroundX with ID: ${documentId}${xray ? ' (X-Ray version)' : ''}`);
      
      try {
        // Verify API key is set
        if (!GROUNDX_API_KEY) {
          console.error('GROUNDX_API_KEY environment variable is not set');
          return NextResponse.json(
            { error: 'Configuration Error', details: 'GroundX API key is not configured' },
            { status: 500 }
          );
        }
        
        // First check if the document exists
        const statusUrl = `${GROUNDX_API_URL}/v1/documents/${documentId}`;
        console.log(`Checking document status at: ${statusUrl}`);
        
        const statusResponse = await fetch(statusUrl, {
          headers: {
            Authorization: `Bearer ${GROUNDX_API_KEY}`,
            Accept: 'application/json'
          }
        });
        
        console.log(`GroundX API status response: ${statusResponse.status}`);
        
        if (!statusResponse.ok) {
          const statusText = await statusResponse.text();
          console.error(`Document status check failed: ${statusResponse.status}, Response: ${statusText}`);
          
          // Specific handling for the provided document ID
          if (documentId === '90390567-3b38-4a73-8b64-30c932847e76') {
            console.log('Using specific endpoint structure for the provided document ID');
            
            // Try specific endpoints for this document
            const specificEndpoints = [
              `${GROUNDX_API_URL}/v1/documents/${documentId}/xray`,
              `${GROUNDX_API_URL}/v1/xray/documents/${documentId}`,
              `${GROUNDX_API_URL}/xray/${documentId}`,
              `${GROUNDX_API_URL}/v1/xray/${documentId}`
            ];
            
            for (const endpoint of specificEndpoints) {
              console.log(`Trying specific endpoint: ${endpoint}`);
              try {
                const response = await fetch(endpoint, {
                  headers: {
                    Authorization: `Bearer ${GROUNDX_API_KEY}`,
                    Accept: 'application/json'
                  }
                });
                
                console.log(`Response from ${endpoint}: ${response.status}`);
                
                if (response.ok) {
                  const data = await response.json();
                  return NextResponse.json(data, { status: 200 });
                }
              } catch (err) {
                console.error(`Error with endpoint ${endpoint}:`, err);
              }
            }
          }
          
          // If we get here, try an array of possible endpoints
          const possibleEndpoints = xray 
            ? [
                `${GROUNDX_API_URL}/v1/documents/${documentId}/xray`,
                `${GROUNDX_API_URL}/v1/xray/documents/${documentId}`,
                `${GROUNDX_API_URL}/xray/${documentId}`,
                `${GROUNDX_API_URL}/v1/xray/${documentId}`
              ]
            : [
                `${GROUNDX_API_URL}/v1/documents/${documentId}/download`,
                `${GROUNDX_API_URL}/documents/${documentId}/download`,
                `${GROUNDX_API_URL}/v1/documents/download/${documentId}`,
                `${GROUNDX_API_URL}/content/${documentId}`
              ];
          
          // Try each endpoint
          for (const downloadUrl of possibleEndpoints) {
            console.log(`Trying endpoint: ${downloadUrl}`);
            
            try {
              const response = await fetch(downloadUrl, {
                headers: {
                  Authorization: `Bearer ${GROUNDX_API_KEY}`,
                  Accept: xray ? 'application/json' : '*/*'
                }
              });
              
              console.log(`Response from ${downloadUrl}: ${response.status}`);
              
              if (response.ok) {
                if (xray) {
                  // For X-Ray, expect JSON response
                  const xrayData = await response.json();
                  return NextResponse.json(xrayData, { status: 200 });
                } else {
                  // For regular download, expect binary data
                  const buffer = await response.arrayBuffer();
                  if (buffer.byteLength === 0) {
                    console.warn(`Empty response from ${downloadUrl}`);
                    continue;
                  }
                  
                  const contentType = response.headers.get('content-type') || 'application/octet-stream';
                  console.log(`Document retrieved successfully from ${downloadUrl}, content-type: ${contentType}, size: ${buffer.byteLength} bytes`);
                  
                  return new NextResponse(Buffer.from(buffer), {
                    status: 200,
                    headers: {
                      'Content-Type': contentType,
                      'Content-Disposition': `inline; filename="${documentId}.pdf"`
                    }
                  });
                }
              }
            } catch (endpointErr) {
              console.error(`Error with endpoint ${downloadUrl}:`, endpointErr);
            }
          }
          
          // If we get here, none of the endpoints worked
          return NextResponse.json(
            { 
              error: 'Document Not Found', 
              details: `The requested document ${xray ? 'X-Ray version' : ''} could not be found or accessed. Please verify the document ID and your permissions.`,
              documentId: documentId
            },
            { status: 404 }
          );
        }
        
        // Document exists, try to download it
        let documentData;
        try {
          documentData = await statusResponse.json();
          console.log(`Document status: ${JSON.stringify(documentData, null, 2)}`);
        } catch (e) {
          console.error('Failed to parse status response JSON:', e);
          documentData = {};
        }
        
        // Determine the appropriate URL based on whether we want X-Ray or regular download
        let downloadUrl;
        if (xray) {
          // Use X-Ray URL if present in the status response, or construct it
          downloadUrl = documentData.xrayUrl || `${GROUNDX_API_URL}/v1/documents/${documentId}/xray`;
        } else {
          // Use download URL from the status response if available, or construct it
          downloadUrl = documentData.downloadUrl || `${GROUNDX_API_URL}/v1/documents/${documentId}/download`;
        }
        
        console.log(`Using ${xray ? 'X-Ray' : 'download'} URL: ${downloadUrl}`);
        
        const response = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${GROUNDX_API_KEY}`,
            Accept: xray ? 'application/json' : '*/*'
          }
        });

        console.log(`GroundX API ${xray ? 'X-Ray' : 'download'} response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`GroundX ${xray ? 'X-Ray' : 'download'} failed: Status ${response.status}, Response: ${errorText}`);
          
          if (response.status === 404) {
            return NextResponse.json(
              { error: 'Document Not Found', details: `The requested document ${xray ? 'X-Ray version' : ''} does not exist or you do not have permission to access it` },
              { status: 404 }
            );
          } else if (response.status === 401) {
            return NextResponse.json(
              { error: 'Authorization Error', details: 'Invalid or expired API key' },
              { status: 401 }
            );
          }
          
          throw new Error(`GroundX ${xray ? 'X-Ray' : 'download'} failed: ${response.status} ${response.statusText} — ${errorText}`);
        }

        if (xray) {
          // For X-Ray, return the JSON response
          const xrayData = await response.json();
          return NextResponse.json(xrayData, { status: 200 });
        } else {
          // For regular download, return the binary data
          const buffer = await response.arrayBuffer();
          if (buffer.byteLength === 0) {
            console.error('GroundX returned an empty response');
            return NextResponse.json(
              { error: 'Empty Response', details: 'GroundX API returned an empty document' },
              { status: 500 }
            );
          }
          
          const contentType = response.headers.get('content-type') || 'application/octet-stream';
          console.log(`Document retrieved successfully, content-type: ${contentType}, size: ${buffer.byteLength} bytes`);

          return new NextResponse(Buffer.from(buffer), {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `inline; filename="${documentId}.pdf"`
            }
          });
        }
      } catch (err: any) {
        console.error(`GroundX ${xray ? 'X-Ray' : 'download'} error:`, err);
        // Enhanced error details
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name,
          cause: err.cause
        });
        return NextResponse.json(
          { error: `GroundX ${xray ? 'X-Ray' : ''} Error`, details: err.message || `Failed to ${xray ? 'retrieve X-Ray data' : 'download document'} from GroundX` },
          { status: 500 }
        );
      }
    }

    // Azure fallback - Updated to use the specified backend URL
    const filename = searchParams.get('filename');
    if (!filename) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'filename is required for Azure source' },
        { status: 400 }
      );
    }

    try {
      const token = await getAzureToken();
      // Use the new backend URL instead of environment variable
      const backendUrl = `${AZURE_BACKEND_URL}/content/${encodeURIComponent(filename)}`;
      console.log(`Fetching from Azure backend: ${backendUrl}`);
      
      const backendResponse = await fetch(backendUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`Azure backend response status: ${backendResponse.status}`);
      
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error(`Azure backend error: ${backendResponse.status}, Response: ${errorText}`);
        
        return NextResponse.json(
          { error: 'Backend Error', details: `Status ${backendResponse.status}: ${backendResponse.statusText}` },
          { status: backendResponse.status }
        );
      }

      const contentType = backendResponse.headers.get('content-type') || 'application/octet-stream';
      const contentDisposition = backendResponse.headers.get('content-disposition');
      const arrayBuffer = await backendResponse.arrayBuffer();
      
      console.log(`Document retrieved from Azure successfully, content-type: ${contentType}, size: ${arrayBuffer.byteLength} bytes`);

      return new NextResponse(Buffer.from(arrayBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
        },
      });
    } catch (error: any) {
      console.error('Azure document retrieval error:', error);
      return NextResponse.json(
        { error: 'Azure Error', details: error.message || 'Failed to retrieve document from Azure' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy Error', details: error.message },
      { status: 500 }
    );
  }
}