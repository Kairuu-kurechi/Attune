// attune-demo.mjs
export default {
  url: 'http://localhost:5173/login',
  viewport: { width: 1440, height: 900 },
  async run(loom) {
    const { page } = loom;

    // 1. Login Flow
    await loom.beat('login');
    // (Replace these with your actual test email/password)
    await page.getByRole('textbox', { name: /email/i }).fill('kyleisraelg@gmail.com');
    await page.getByRole('textbox', { name: /password/i }).fill('test1234');
    await page.getByRole('button', { name: /sign in/i }).click();
    await loom.pause(2000);

    // 2. Dashboard
    await loom.beat('dashboard');
    await loom.pause(1500);
    await page.getByRole('button', { name: /create new session/i }).click();
    await loom.pause(1000);
    await page.getByRole('textbox', { name: /title/i }).fill('Sunday Sermon: Kindness');
    await page.getByRole('button', { name: /start/i }).click();
    await loom.pause(3000); // Wait for LiveSession to load

    // 3. The Live Session (Simulate the Mic & Question)
    await loom.beat('live-session');
    
    // Click Start Listening (Note: Playwright can auto-grant mic permissions)
    await page.getByRole('button', { name: /start listening/i }).click();
    await loom.pause(4000); // Wait 4 seconds to simulate speaking

    // Instead of scanning a QR code, we simulate the phone submitting a question
    // by making a direct fetch request to your backend WebSocket (or just wait for the simulator)
    // For the demo, we can just trigger the python simulator in the background!
    // Or, if you have a "Test Question" button in your UI, click it here.
    await loom.pause(5000); // Wait for the graph and question to appear

    // 4. Address the Question
    await loom.beat('resolve');
    // Find the "Address Now" button and click it
    const addressBtn = page.getByRole('button', { name: /address now/i }).first();
    if (await addressBtn.isVisible()) {
        await addressBtn.click();
    }
    await loom.pause(2000);

    // 5. End Session & Report
    await loom.beat('report');
    await page.getByRole('button', { name: /end session/i }).click();
    await loom.pause(6000); // Wait for the AI to generate the report
  }
};