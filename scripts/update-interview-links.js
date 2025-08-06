/**
 * Script to update existing interview links from old format to new secure format
 * Run this once to migrate existing interviews to use the new verification flow
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const { eq, like } = require('drizzle-orm');
const postgres = require('postgres');

// You'll need to add your database connection details
const connectionString = process.env.DATABASE_URL || 'your-database-url-here';
const sql = postgres(connectionString);
const db = drizzle(sql);

// Import your schema
const { Interview, CodingInterview, campaignInterviews } = require('../lib/database/schema');

async function updateInterviewLinks() {
  console.log('🔄 Starting interview links migration...');
  
  try {
    // Update Interview table (direct interviews)
    const directInterviews = await db
      .select()
      .from(Interview)
      .where(like(Interview.interviewLink, '%/candidate/interview/%'));

    console.log(`📋 Found ${directInterviews.length} direct interviews to update`);

    for (const interview of directInterviews) {
      const newLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview/verify?email=${encodeURIComponent(interview.candidateEmail)}&interviewId=${interview.interviewId}&type=${interview.interviewType || 'behavioral'}`;
      
      await db
        .update(Interview)
        .set({ interviewLink: newLink })
        .where(eq(Interview.id, interview.id));
      
      console.log(`✅ Updated direct interview: ${interview.interviewId}`);
    }

    // Update CodingInterview table
    const codingInterviews = await db
      .select()
      .from(CodingInterview)
      .where(like(CodingInterview.interviewLink, '%/candidate/interview/%'));

    console.log(`📋 Found ${codingInterviews.length} coding interviews to update`);

    for (const interview of codingInterviews) {
      const newLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview/verify?email=${encodeURIComponent(interview.candidateEmail)}&interviewId=${interview.interviewId}&type=coding`;
      
      await db
        .update(CodingInterview)
        .set({ interviewLink: newLink })
        .where(eq(CodingInterview.id, interview.id));
      
      console.log(`✅ Updated coding interview: ${interview.interviewId}`);
    }

    // Update campaignInterviews table
    const campaigns = await db
      .select()
      .from(campaignInterviews)
      .where(like(campaignInterviews.interviewLink, '%/candidate/interview/%'));

    console.log(`📋 Found ${campaigns.length} campaign interviews to update`);

    for (const interview of campaigns) {
      const newLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/interview/verify?email=${encodeURIComponent(interview.candidateEmail || '')}&interviewId=${interview.interviewId}&type=${interview.interviewType || 'behavioral'}`;
      
      await db
        .update(campaignInterviews)
        .set({ interviewLink: newLink })
        .where(eq(campaignInterviews.id, interview.id));
      
      console.log(`✅ Updated campaign interview: ${interview.interviewId}`);
    }

    console.log('🎉 Migration completed successfully!');
    console.log(`📊 Updated ${directInterviews.length + codingInterviews.length + campaigns.length} total interviews`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

// Run the migration
updateInterviewLinks();