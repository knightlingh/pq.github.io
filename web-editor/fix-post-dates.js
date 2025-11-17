#!/usr/bin/env node
/**
 * Script to add missing 'date' metadata to all posts based on filename
 * Run: node fix-post-dates.js
 */
const fs = require('fs').promises;
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', '_posts');

async function fixPostDates() {
  try {
    const files = await fs.readdir(POSTS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    console.log(`Found ${mdFiles.length} post files`);
    
    for (const file of mdFiles) {
      const filePath = path.join(POSTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // extract date from filename (YYYY-MM-DD prefix)
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) {
        console.log(`❌ ${file} - no date in filename`);
        continue;
      }
      
      const fileDate = dateMatch[1];
      
      // check if post already has a date field
      if (/^\s*date:/m.test(content)) {
        console.log(`✓ ${file} - already has date field`);
        continue;
      }
      
      // parse frontmatter
      if (!content.startsWith('---')) {
        console.log(`❌ ${file} - no frontmatter`);
        continue;
      }
      
      const parts = content.split('---');
      if (parts.length < 3) {
        console.log(`❌ ${file} - invalid frontmatter`);
        continue;
      }
      
      let frontmatter = parts[1];
      const postContent = parts.slice(2).join('---');
      
      // add date field before categories or at end
      const dateField = `date: ${fileDate}`;
      
      if (/^\s*categories:/m.test(frontmatter)) {
        // insert before categories
        frontmatter = frontmatter.replace(/^(\s*categories:)/m, `${dateField}\n$1`);
      } else {
        // append before closing ---
        frontmatter = frontmatter.trimRight() + '\n' + dateField;
      }
      
      const updatedContent = `---${frontmatter}\n---${postContent}`;
      await fs.writeFile(filePath, updatedContent, 'utf8');
      console.log(`✅ ${file} - added date: ${fileDate}`);
    }
    
    console.log('\nDone! All posts have been updated with date metadata.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPostDates();
