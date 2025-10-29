/**
 * Grokipedia to Wikitext Exporter
 *
 * This script, when run in a browser console on a Grokipedia article page,
 * will parse the article content and convert it into Wikitext format.
 * It then triggers a download of the resulting content as a .txt file.
 *
 * @version 1.0.0
 * @author Gemini
 */
function exportGrokipediaToWikitext() {

    console.log("Starting Grokipedia export...");

    /**
     * Recursively processes a node and its children to generate Wikitext.
     * @param {Node} node - The HTML node to process.
     * @returns {string} The node's content as a Wikitext string.
     */
    function getNodeWikitext(node) {
        let text = '';

        // Iterate over all child nodes
        node.childNodes.forEach(child => {
            if (child.nodeType === 3) { // Node.TEXT_NODE
                text += child.textContent;
            } else if (child.nodeType === 1) { // Node.ELEMENT_NODE
                switch (child.tagName) {
                    case 'STRONG':
                        // '''bold'''
                        text += `'''${getNodeWikitext(child)}'''`;
                        break;
                    case 'EM':
                    case 'I':
                        // ''italic''
                        text += `''${getNodeWikitext(child)}''`;
                        break;
                    case 'SUP':
                        // Citation, e.g., [1]
                        text += child.textContent;
                        break;
                    case 'BR':
                        // Newline
                        text += '\n';
                        break;
                    case 'A':
                        // External link [http://example.com link text]
                        // We check if it's an absolute link to a different domain.
                        if (child.href && child.href.startsWith('http') && !child.href.startsWith(window.location.origin)) {
                            text += `[${child.href} ${getNodeWikitext(child)}]`;
                        } else {
                            // Internal link or other, just get text.
                            text += getNodeWikitext(child);
                        }
                        break;
                    case 'BUTTON':
                        // Skip "Copy link to heading" buttons entirely.
                        break;
                    default:
                        // Recurse for other nested elements (e.g., spans within spans)
                        text += getNodeWikitext(child);
                }
            }
        });
        return text;
    }

    const article = document.querySelector('article');
    if (!article) {
        console.error("Export failed: Could not find <article> element.");
        return;
    }

    let wikitext = '';
    // This selector targets all the main content blocks in order.
    // We specifically look for the paragraph spans by their common class.
    const selector = 'h1, h2, h3, span.mb-4, table, div#references';

    article.querySelectorAll(selector).forEach(node => {
        try {
            if (node.tagName === 'H1') {
                // = Page Title =
                wikitext += `= ${getNodeWikitext(node).trim()} =\n\n`;
            } else if (node.tagName === 'H2') {
                // == Section ==
                wikitext += `== ${getNodeWikitext(node).trim()} ==\n\n`;
            } else if (node.tagName === 'H3') {
                // === Subsection ===
                wikitext += `=== ${getNodeWikitext(node).trim()} ===\n\n`;
            } else if (node.tagName === 'SPAN' && node.classList.contains('mb-4')) {
                // Paragraph text
                const paragraphText = getNodeWikitext(node).trim();
                if (paragraphText) {
                    wikitext += paragraphText + '\n\n';
                }
            } else if (node.tagName === 'TABLE') {
                // {| class="wikitable"
                // |-
                // ! Header
                // |-
                // | Cell
                // |}
                wikitext += '{| class="wikitable"\n';
                
                // Process headers
                node.querySelectorAll('thead tr').forEach(tr => {
                    wikitext += '|- \n';
                    tr.querySelectorAll('th').forEach(th => {
                        wikitext += `! ${getNodeWikitext(th).trim()} \n`;
                    });
                });
                
                // Process body
                node.querySelectorAll('tbody tr').forEach(tr => {
                    wikitext += '|- \n';
                    tr.querySelectorAll('td').forEach(td => {
                        wikitext += `| ${getNodeWikitext(td).trim()} \n`;
                    });
                });
                
                wikitext += '|}\n\n';
            } else if (node.id === 'references') {
                // == References ==
                // # [link]
                // # [link]
                const h2 = node.querySelector('h2');
                if (h2) {
                    wikitext += `== ${getNodeWikitext(h2).trim()} ==\n`;
                }
                
                node.querySelectorAll('ol > li').forEach(li => {
                    const a = li.querySelector('a');
                    if (a && a.href) {
                        // Create a numbered list item with just the external link
                        wikitext += `# [${a.href}]\n`;
                    } else if (li.textContent.trim()) {
                        wikitext += `# ${li.textContent.trim()}\n`;
                    }
                });
                wikitext += '\n';
            }
        } catch (e) {
            console.warn("Could not process node:", node, e);
        }
    });

    // --- File Download Logic ---

    // Create a blob with the Wikitext content
    const blob = new Blob([wikitext], { type: 'text/plain;charset=utf-8' });
    
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    
    // Generate a file name from the page title
    const title = document.title.split('|')[0].trim().replace(/\s+/g, '_') || 'Grokipedia_Export';
    a.download = `${title}.wikitext.txt`;
    
    // Append to body, click, and remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the blob URL
    URL.revokeObjectURL(a.href);
    
    console.log(`Export complete! File '${a.download}' should be downloading.`);
}

// Run the function
exportGrokipediaToWikitext();
