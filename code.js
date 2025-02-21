// This plugin checks text layers for reading level using Flesch-Kincaid Grade Level
figma.showUI(__html__, { 
  width: 400, 
  height: 200,  // Start with minimal height
  themeColors: true 
});

// Send initial theme to UI
figma.ui.postMessage({ 
  type: 'init-theme',
  isDark: figma.ui.getTheme() === 'dark'
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

// Main plugin logic

// Add function to resize window
function resizeWindow() {
  // Get the body height and add some padding
  const height = Math.min(800, document.body.scrollHeight + 40);
  parent.postMessage({ 
    pluginMessage: { 
      type: 'resize', 
      height: height 
    }
  }, '*');
}

// Add theme change listener
figma.ui.onmessage = (msg) => {
  if (msg.type === 'analyze-text') {
    updateSelectedNodes();
  } else if (msg.type === 'resize') {
    figma.ui.resize(400, msg.height);
  } else if (msg.type === 'theme-changed') {
    // Update the UI theme when toggled
    figma.ui.setTheme(msg.isDark ? 'dark' : 'light');
  }
};

function getReadingLevel(score) {
  if (score <= 5) return 'Easy';
  if (score <= 14) return 'Average';
  return 'Hard';
}

function updateSelectedNodes() {
  const textNodes = figma.currentPage.selection
    .filter(node => node.type === 'TEXT');

  if (textNodes.length === 0) {
    figma.ui.postMessage({
      type: 'analysis-results',
      results: [],
      message: 'No text layers selected'
    });
    return;
  }

  const results = [];

  textNodes.forEach((node, index) => {
    figma.ui.postMessage({
      type: 'analysis-progress',
      progress: (index + 1) / textNodes.length
    });

    const text = node.characters;
    const score = getFleschKincaidGrade(text);
    const readingLevel = getReadingLevel(score);
    
    results.push({
      text: text,
      readingLevel: readingLevel,
      score: score,
      nodeId: node.id
    });
  });

  figma.ui.postMessage({
    type: 'analysis-results',
    results: results
  });
}

// Don't automatically run on selection change as it might be annoying
// Instead, only run when the Check button is clicked
// figma.on('selectionchange', updateSelectedNodes);