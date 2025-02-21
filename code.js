// This plugin checks text layers for reading level using Flesch-Kincaid Grade Level
figma.showUI(__html__, { width: 400, height: 300 });

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
let targetGradeLevel = 5.0; // Default target grade level

figma.ui.onmessage = (msg) => {
  if (msg.type === 'analyze-text') {
    targetGradeLevel = parseFloat(msg.targetGrade);
    updateSelectedNodes();
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
    results: results,
    targetGrade: targetGradeLevel
  });
}

// Don't automatically run on selection change as it might be annoying
// Instead, only run when the Check button is clicked
// figma.on('selectionchange', updateSelectedNodes);