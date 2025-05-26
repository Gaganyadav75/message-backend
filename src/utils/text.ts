export const indexHtmlFile = `
    <html>
      <head>
        <style>
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #121212;
            color: #00ffcc;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 2em;
          }
          .loading-text {
            position: relative;
          }
          .loading-text::after {
            content: '';
            display: inline-block;
            width: 1em;
            text-align: left;
            animation: dots 1.5s steps(3, end) infinite;
          }
          @keyframes dots {
            0%, 20% {
              content: '';
            }
            40% {
              content: '.';
            }
            60% {
              content: '..';
            }
            80%, 100% {
              content: '...';
            }
          }
        </style>
      </head>
      <body>
        <div class="loading-text">Backend is running</div>
      </body>
    </html>
  `