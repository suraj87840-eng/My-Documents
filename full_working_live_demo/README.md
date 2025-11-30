Full Working Demo - Teacher (broadcast) -> Students (viewers) using simple peer-per-student WebRTC

How it works (for testing / small classes):
- Teacher opens /public/teacher.html, clicks Start Camera, then Start Live.
- Students open /public/index.html and click join (they auto-send join request).
- Teacher will see waiting student IDs; clicking 'Allow' will create a direct PeerConnection between teacher and that student using standard WebRTC offer/answer via Socket.IO signallling.
- Student will receive remote video track and show it.

Important testing notes:
- WebRTC requires HTTPS for remote devices. For quick testing across laptop + phone, use ngrok:
  1) Install ngrok and run: ngrok http 3000
  2) Note the https URL (like https://abcd1234.ngrok.io)
  3) Open https://abcd1234.ngrok.io/teacher.html on laptop (allow camera)
  4) Open https://abcd1234.ngrok.io/index.html on phone (student)
- Alternatively host on VPS with Let's Encrypt SSL.

Limitations:
- This approach creates one RTCPeerConnection per student and is suitable for testing or small classrooms (tens of viewers). For large scale use an SFU such as mediasoup.
- TURN server is not configured here; in some NAT cases you may need a TURN server for connectivity (coturn).

Run locally:
- npm install
- npm start
- open http://localhost:3000/teacher.html

If you want, I can:
- Add a simple Node command in README to generate an HTTPS self-signed cert for local testing (not recommended for mobile).
- Provide step-by-step ngrok commands or automate ngrok launch.
- Add basic authentication for teacher to prevent others from becoming teacher.
