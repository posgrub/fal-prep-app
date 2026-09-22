import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { config, contentVersion, curriculum } from '../content';
import { Card, Header } from '../components/ui';

export default function About() {
  const counts = useLiveQuery(async () => {
    const all = await db.question.filter(q => !q.retired).toArray();
    return { total: all.length, unreviewed: all.filter(q => q.needsReview).length, tfm11: all.filter(q => q.exam === 'TFM11').length, tfm12: all.filter(q => q.exam === 'TFM12').length };
  }, []);
  return (
    <>
      <Header title="About" back="/settings" />
      <Card>
        <h3>FAL Prep</h3>
        <p className="small">Study app for the Texas Fire Alarm Technician (FAL) license exams TFM11 and TFM12. {curriculum.days.length}-day course, 12 weeks.</p>
        <ul className="small">
          <li>Content version: {contentVersion}</li>
          <li>Adopted editions: {config.adoptedEditions.nfpa72}, {config.adoptedEditions.nec} ({config.adoptedEditions.adoptedBy})</li>
          <li>Daily test: {config.dailyTest.newQuestions} new + {config.dailyTest.reviewQuestions} review, {config.dailyTest.passPercent}% to pass</li>
          <li>Mock exam: {config.mockExam.questions} questions, {config.mockExam.passPercent}% to pass, {config.mockExam.timeLimitMinutes} min</li>
          {counts && <li>Question bank: {counts.total} ({counts.tfm11} TFM11, {counts.tfm12} TFM12), {counts.unreviewed} still unreviewed</li>}
        </ul>
      </Card>
      <Card>
        <h3>Content accuracy</h3>
        <p className="small">Questions marked <strong>Unreviewed</strong> have not yet been approved by a licensed FAL/APS holder. Treat them as study prompts, not authority. NFPA 72 and the NEC are copyrighted by NFPA and are not included in this app; read them free at nfpa.org or buy the books.</p>
      </Card>
    </>
  );
}
