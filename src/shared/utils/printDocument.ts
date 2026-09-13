/**
 * Print a rendered document on its own, away from the app.
 *
 * The letters are already complete HTML with their own inline styling, so the
 * cleanest print is a blank window containing just the letter — no sidebar, no
 * modal chrome, and none of the app's stylesheet to fight with. Printing the
 * page in place would carry all of that onto the paper.
 *
 * Returns false when the browser blocked the popup, so the caller can say so
 * rather than appearing to do nothing.
 */
export function printDocument(html: string, title: string): boolean {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return false;

  win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title.replace(/[<>]/g, '')}</title>
    <style>
      /* A4 with the margins the printed originals use. */
      @page { size: A4; margin: 18mm 16mm; }
      html, body { margin: 0; padding: 0; background: #fff; }
      /* The letter carries its own width for screen; on paper the page
         margins do that job, so let it fill the printable area. */
      @media print {
        body > div { max-width: none !important; padding: 0 !important; }
      }
    </style>
  </head>
  <body>${html}</body>
</html>`);
  win.document.close();

  // Wait for layout before printing, or the first page can come out blank.
  const go = () => {
    win.focus();
    win.print();
  };
  if (win.document.readyState === 'complete') {
    setTimeout(go, 120);
  } else {
    win.addEventListener('load', () => setTimeout(go, 120));
  }
  return true;
}
