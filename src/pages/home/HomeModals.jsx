import CoordinateLogModal from './CoordinateLogModal';
import WorkArchiveFormPanel from './WorkArchiveFormPanel';
import WorkDetailPanel from './WorkDetailPanel';

export default function HomeModals({
  coordinateLog,
  user,
  workArchive,
}) {
  return (
    <>
      {coordinateLog.isOpen && (
        <CoordinateLogModal
          coordinateLogMessage={coordinateLog.message}
          coordinateLogStatus={coordinateLog.status}
          coordinateLogUrl={coordinateLog.url}
          onClose={coordinateLog.onClose}
          onSubmit={coordinateLog.onSubmit}
          onUrlChange={coordinateLog.onUrlChange}
          selectedCoordinate={coordinateLog.selectedCoordinate}
        />
      )}

      {workArchive.isSubmitOpen && (
        <WorkArchiveFormPanel
          form={workArchive.submitForm}
          message={workArchive.submitMessage}
          onChange={workArchive.onSubmitFormChange}
          onClose={workArchive.onSubmitClose}
          onSubmit={workArchive.onSubmit}
          status={workArchive.submitStatus}
        />
      )}

      <WorkDetailPanel
        commentMessage={workArchive.commentMessage}
        commentStatus={workArchive.commentStatus}
        commentText={workArchive.commentText}
        comments={workArchive.comments}
        onClose={workArchive.onDetailClose}
        onCommentSubmit={workArchive.onCommentSubmit}
        onCommentTextChange={workArchive.onCommentTextChange}
        onWorkStatusChange={workArchive.onWorkStatusChange}
        user={user}
        work={workArchive.selectedWork}
        workStatus={workArchive.selectedWork ? workArchive.statuses[workArchive.selectedWork.code] : ''}
        workStatusSaving={workArchive.statusSaving}
      />
    </>
  );
}
