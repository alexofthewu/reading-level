// This plugin checks text layers for reading level using Flesch-Kincaid Grade Level
const DEFAULT_HEIGHT = 300;

figma.showUI(__html__, { 
  width: 420, 
  height: DEFAULT_HEIGHT,
  themeColors: true 
});

// Initialize text scoring functions
function countSyllables(word) {
  word = word.toLowerCase();
  let count = 0;
  const vowels = 'aeiouy';
  let isPrevVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !isPrevVowel) {
      count++;
    }
    isPrevVowel = isVowel;
  }

  if (word.endsWith('e')) count--;
  return count || 1;
}

function getFleschKincaidGrade(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const words = text.split(/\s+/).filter(w => w.trim());
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  return (0.39 * avgSentenceLength) + (11.8 * avgSyllablesPerWord) - 15.59;
}

function getReadingLevel(score) {
  if (score <= 5) return 'Easy';
  if (score <= 14) return 'Average';
  return 'Hard';
}

// Function to analyze text
async function analyzeSelectedText() {
  const selection = figma.currentPage.selection;
  
  // Check if selection contains text nodes or components with text
  const textNodes = selection.reduce((nodes, node) => {
    if (node.type === "TEXT") {
      nodes.push(node);
    } else if (node.type === "COMPONENT" || node.type === "INSTANCE") {
      // Find all text nodes within components
      const textChildren = node.findAll(child => child.type === "TEXT");
      nodes.push(...textChildren);
    }
    return nodes;
  }, []);

  const selectedTextNodes = textNodes.map(node => node.characters);

  if (selectedTextNodes.length > 0) {
    const results = selectedTextNodes.map((text) => {
      const score = getFleschKincaidGrade(text);
      return {
        text,
        score,
        readingLevel: getReadingLevel(score)
      };
    });

    figma.ui.postMessage({
      type: 'analysis-results',
      results
    });
  } else {
    figma.ui.postMessage({
      type: 'analysis-results',
      results: []
    });
  }
}

// Listen for selection changes
figma.on('selectionchange', () => {
  analyzeSelectedText();
});

// Listen for text changes in selected nodes
figma.on('documentchange', (event) => {
  // Check if the change affects any selected nodes
  const selectedNodes = figma.currentPage.selection;
  const selectedIds = new Set(selectedNodes.map(node => node.id));
  
  // If any changed node is selected or is within a selected component, reanalyze
  const shouldReanalyze = event.documentChanges.some(change => {
    if (selectedIds.has(change.id)) return true;
    
    // Check if the changed node is within a selected component
    const node = figma.getNodeById(change.id);
    if (node && node.type === "TEXT") {
      let currentParent = node.parent;
      while (currentParent) {
        if (selectedIds.has(currentParent.id)) return true;
        currentParent = currentParent.parent;
      }
    }
    return false;
  });

  if (shouldReanalyze) {
    analyzeSelectedText();
  }
});

// Listen for UI messages
figma.ui.onmessage = (message) => {
  if (message.type === 'resize') {
    // Set exact height from content
    figma.ui.resize(420, message.height);
  }
};

// Initial analysis of any selected text
analyzeSelectedText();