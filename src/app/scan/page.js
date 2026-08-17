'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, X, Camera, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    let html5QrcodeScanner = null;
    
    // Dynamically import to avoid SSR issues with navigator/window
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (!scannerRef.current) return;
      
      html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        /* verbose= */ false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          // Check if it's a URL belonging to our app
          if (decodedText.includes('/scan/')) {
            setScanning(false);
            html5QrcodeScanner.clear();
            
            // Extract the ID (assuming format is .../scan/[id])
            const parts = decodedText.split('/scan/');
            if (parts.length === 2) {
              const id = parts[1];
              router.push(`/scan/${id}`);
            }
          } else {
            // If it's just a plain UUID or something else, try to route it anyway
            setScanning(false);
            html5QrcodeScanner.clear();
            router.push(`/scan/${decodedText}`);
          }
        },
        (errorMessage) => {
          // Ignore frequent scan failure errors, only log actual camera errors if needed
        }
      );
    }).catch(err => {
      console.error("Error loading html5-qrcode", err);
      setError("Could not load scanner. Please ensure you are on a secure connection (HTTPS).");
    });

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(console.error);
      }
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
        
        {/* Header */}
        <div className="p-6 text-center border-b border-slate-800 relative">
          <Link href="/dashboard" className="absolute left-6 top-6 text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </Link>
          <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Camera className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Scan Asset QR</h1>
          <p className="text-sm text-slate-400">Point your camera at the machine's QR code to view its profile and history.</p>
        </div>

        {/* Scanner Area */}
        <div className="p-6 bg-black relative">
          {error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
              <p className="text-rose-400 font-medium">{error}</p>
            </div>
          ) : scanning ? (
            <div id="qr-reader" ref={scannerRef} className="w-full rounded-2xl overflow-hidden border-2 border-indigo-500/30" />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-indigo-400 font-medium">Navigating to Asset Profile...</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Fallback styling for the injected html5-qrcode elements */}
      <style dangerouslySetInnerHTML={{__html: `
        #qr-reader { border: none !important; }
        #qr-reader__scan_region { background: black !important; }
        #qr-reader__dashboard_section_csr span { color: white !important; }
        #qr-reader__dashboard_section_swaplink { color: #6366f1 !important; text-decoration: none !important; }
        #qr-reader button { 
          background: #6366f1 !important; 
          color: white !important; 
          border: none !important; 
          padding: 8px 16px !important; 
          border-radius: 8px !important; 
          font-weight: 600 !important;
          margin-top: 10px !important;
        }
        #qr-reader select {
          background: #1e293b !important;
          color: white !important;
          border: 1px solid #334155 !important;
          padding: 8px !important;
          border-radius: 8px !important;
        }
      `}} />
    </div>
  );
}
