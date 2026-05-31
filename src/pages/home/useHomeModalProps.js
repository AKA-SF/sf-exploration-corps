export default function useHomeModalProps({
  coordinate,
  workArchive,
}) {
  return {
    coordinateLog: {
      isOpen: coordinate.isLogModalOpen,
      message: coordinate.coordinateLogMessage,
      onClose: coordinate.closeCoordinateLogModal,
      onSubmit: coordinate.submitCoordinateLog,
      onUrlChange: coordinate.setCoordinateLogUrl,
      selectedCoordinate: coordinate.selectedCoordinate,
      status: coordinate.coordinateLogStatus,
      url: coordinate.coordinateLogUrl,
    },
    workArchive: {
      commentMessage: workArchive.commentMessage,
      commentStatus: workArchive.commentStatus,
      commentText: workArchive.commentText,
      comments: workArchive.workComments,
      isSubmitOpen: workArchive.isWorkSubmitOpen,
      onCommentSubmit: workArchive.submitWorkComment,
      onCommentTextChange: workArchive.setCommentText,
      onDetailClose: workArchive.closeWorkDetail,
      onSubmit: workArchive.submitWorkArchive,
      onSubmitClose: workArchive.closeWorkSubmit,
      onSubmitFormChange: workArchive.updateWorkSubmitForm,
      onWorkStatusChange: workArchive.updateWorkStatus,
      selectedWork: workArchive.selectedWork,
      statusSaving: workArchive.workStatusSaving,
      statuses: workArchive.workStatuses,
      submitForm: workArchive.workSubmitForm,
      submitMessage: workArchive.workSubmitMessage,
      submitStatus: workArchive.workSubmitStatus,
    },
  };
}
