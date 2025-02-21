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
  if (msg.type === 'setGradeLevel') {
    targetGradeLevel = parseFloat(msg.gradeLevel);
    updateSelectedNodes();
  }
};

function updateSelectedNodes() {
  const textNodes = figma.currentPage.selection
    .filter(node => node.type === 'TEXT');

  textNodes.forEach(node => {
    const text = node.characters;
    const grade = getFleschKincaidGrade(text);
    
    // Add or update reading level indicator
    const indicator = figma.createText();
    const isGradeLevelAppropriate = grade <= targetGradeLevel;
    const gradeText = `Reading Level: Grade ${grade.toFixed(1)}`;
    const feedback = isGradeLevelAppropriate ? 
      ` ✓ Meets Grade ${targetGradeLevel} target` : 
      ` ⚠️ Above Grade ${targetGradeLevel} level`;
    
    indicator.characters = gradeText + feedback;
    indicator.x = node.x;
    indicator.y = node.y - 20;
    
    // Style the indicator
    indicator.fontSize = 10;
    indicator.fills = [{
      type: 'SOLID', 
      color: isGradeLevelAppropriate ? 
        {r: 0, g: 0.7, b: 0} :  // Green for appropriate level
        {r: 1, g: 0.6, b: 0}    // Orange for too high
    }];
  });
}

figma.on('selectionchange', updateSelectedNodes);
