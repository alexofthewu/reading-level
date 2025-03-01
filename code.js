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
  if (score <= 6) return 'Easy';
  if (score <= 12) return 'Average';
  return 'Hard';
}

function getGradeLevel(score) {
  if (score <= 3) return 'Kindergarten';
  if (score <= 6) return 'Elementary';
  if (score <= 9) return 'Middle School';
  if (score <= 12) return 'High School';
  if (score <= 15) return 'College';
  return 'Post-graduate';
}

function getReadabilityClass(readingLevel) {
  switch (readingLevel) {
    case 'Easy':
    case 'Kindergarten':
    case 'Elementary':
      return 'readability-easy'; // For Kindergarten and Elementary
    case 'Average':
    case 'Middle School':
      return 'readability-average'; // For Middle School
    case 'Hard':
    case 'High School':
    case 'College':
    case 'Post-graduate':
      return 'readability-hard'; // For High School, College, and Post-graduate
    default:
      return '';
  }
}

// Function to analyze text
function analyzeSelectedText() {
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
      const gradeLevel = getGradeLevel(score);
      return {
        text,
        score,
        readingLevel: getReadingLevel(score),
        gradeLevel
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
  const selectedNodes = figma.currentPage.selection;
  const selectedIds = new Set(selectedNodes.map(node => node.id));
  
  const shouldReanalyze = event.documentChanges.some(change => {
    if (selectedIds.has(change.id)) return true;
    
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
    figma.ui.resize(420, message.height);
  }
};

// Initial analysis
setTimeout(() => {
  analyzeSelectedText();
}, 100);