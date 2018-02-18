import { connect } from 'react-redux';
import { selectMember } from '../../actions';
import Prominent from './Prominent';
import { groupBy, sortBy, take, first } from 'lodash';

const loadBoards = (boardMembers, members) => {
  return boardMembers.map(boardMember => {
    return {
      id: boardMember.member_id,
      year: boardMember.year,
      function: boardMember.function,
      member: members.find(member => member.id === boardMember.member_id)
    };
  });
};
const SHOW_N_BOARDS = 6;
const prominent = state => {
  const boards = take(
    sortBy(
      groupBy(
        loadBoards(state.boardMembers, state.members),
        boardMember => boardMember.year
      ),
      board => -first(board).year
    ),
    SHOW_N_BOARDS
  );

  const boardMembersId = boards.reduce((members, board) => {
    console.log(members, board);
    return [...members, ...board.map(member => member.member.id)];
  }, []);

  console.log('Board members', boardMembersId);

  console.log(
    state.members.map(member => member.prominent).filter(p => p !== null)
  );

  const prominent = take(
    sortBy(
      state.members.filter(member => member.prominent !== null),
      member => -member.prominent
    ).filter(member => !boardMembersId.includes(member.id)), // don't include members who are shown as a board member
    200
  );

  return {
    prominent: prominent,
    boards: boards
  };
};

const mapStateToProps = state => {
  return prominent(state);
};

const mapDispatchToProps = dispatch => {
  return {
    selectMember: member => {
      dispatch(selectMember(member));
    }
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(Prominent);
