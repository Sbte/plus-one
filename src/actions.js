import { orderBy, pick } from 'lodash';
import { push, goBack as goBackRoute } from 'react-router-redux';

export const actions = {
  goBack,
  buyMore,
  makeOrder,
  buyAll,
  cancelOrder,

  addProductToOrder,
  selectRangeOfSurnames,
  selectMember,
  selectGuest,
  selectCommittee,

  fetchInitialData,
  fetchMembers,
  fetchProducts,
  fetchBoardMembers,
  fetchCommitteeMembers
};

export const TYPES = {
  GO_BACK: 'BO_BACK',

  BUY_MORE: 'TOGGLE_BUY_MORE_PRODUCTS',
  ADD_PRODUCT_TO_ORDER: 'ADD_PRODUCT_TO_ORDER',

  QUEUE_ORDER: 'QUEUE_ORDER',
  CANCEL_ORDER: 'CANCEL_ORDER',

  BUY_ORDER_REQUEST: 'BUY_ORDER_REQUEST',
  BUY_ORDER_SUCCESS: 'BUY_ORDER_SUCCESS',
  BUY_ORDER_FAILURE: 'BUY_ORDER_FAILURE',

  SELECT_SURNAME_RANGE: 'SELECT_SURNAME_RANGE',
  SELECT_MEMBER: 'SELECT_MEMBER',
  SELECT_COMMITTEE: 'SELECT_COMMITTEE',

  FETCH_MEMBERS_REQUEST: 'FETCH_MEMBERS_REQUEST',
  FETCH_MEMBERS_SUCCESS: 'FETCH_MEMBERS_SUCCESS',
  FETCH_MEMBERS_FAILURE: 'FETCH_MEMBERS_FAILURE',

  FETCH_BOARD_MEMBERS_REQUEST: 'FETCH_BOARD_MEMBERS_REQUEST',
  FETCH_BOARD_MEMBERS_SUCCESS: 'FETCH_BOARD_MEMBERS_SUCCESS',
  FETCH_BOARD_MEMBERS_FAILURE: 'FETCH_BOARD_MEMBERS_FAILURE',

  FETCH_COMMITTEE_MEMBERS_REQUEST: 'FETCH_COMMITTEE_MEMBERS_REQUEST',
  FETCH_COMMITTEE_MEMBERS_SUCCESS: 'FETCH_COMMITTEE_MEMBERS_SUCCESS',
  FETCH_COMMITTEE_MEMBERS_FAILURE: 'FETCH_COMMITTEE_MEMBERS_FAILURE',

  FETCH_PRODUCTS_REQUEST: 'FETCH_PRODUCTS_REQUEST',
  FETCH_PRODUCTS_SUCCESS: 'FETCH_PRODUCTS_SUCCESS',
  FETCH_PRODUCTS_FAILURE: 'FETCH_PRODUCTS_FAILURE'
};

export function selectRangeOfSurnames(range) {
  return dispatch => {
    dispatch(push(`/members/${range.idx}`));
    dispatch({
      type: TYPES.SELECT_SURNAME_RANGE,
      range
    });
  };
}

/**
 * TODO: currently we only have an option for adding products to
 * an order, however it should be possible to either add and buy, or
 * add multiple products and buy manually
 */
export function addProductToOrder(product) {
  return (dispatch, getState) => {
    const { order } = getState();

    if (!order.buyMore) {
      return dispatch(makeOrder({ member: order.member, products: [product] }));
    } else {
      dispatch({
        type: TYPES.ADD_PRODUCT_TO_ORDER,
        product,
        member: order.member
      });
    }
  };
}

export function buyAll() {
  return makeOrder();
}

const orderQueue = {};

export const TIME_TO_CANCEL = 7000;
export function makeOrder(order = undefined) {
  return (dispatch, getState) => {
    return new Promise(resolve => {
      const date = new Date();

      order = order === undefined ? getState().order : order;

      dispatch({
        type: TYPES.QUEUE_ORDER,
        order: pick(order, 'member', 'products'),
        ordered_at: date.getTime()
      });
      dispatch(push('/'));

      orderQueue[date.getTime()] = setTimeout(() => {
        dispatch(buyOrder(order.member, order, date));
      }, TIME_TO_CANCEL);
      resolve();
    });
  };
}

export function cancelOrder(order, ordered_at) {
  return dispatch => {
    clearTimeout(orderQueue[ordered_at]);
    delete orderQueue[ordered_at];

    dispatch({
      type: TYPES.CANCEL_ORDER,
      order: pick(order, 'member', 'products'),
      ordered_at
    });
  };
}

function buyOrder(member, order, date) {
  return (dispatch, getState, api) => {
    delete orderQueue[date.getTime()];

    dispatch({
      type: TYPES.BUY_ORDER_REQUEST,
      member,
      order,
      ordered_at: date.getTime()
    });

    return api
      .post('/orders', {
        member: pick(member, ['id', 'firstName', 'surname']),
        order: {
          products: order.products.map(product =>
            pick(product, ['id', 'name', 'price'])
          )
        }
      })
      .then(response => {
        dispatch({
          type: TYPES.BUY_ORDER_SUCCESS,
          member,
          order
        });
      })
      .catch(ex =>
        dispatch({
          type: TYPES.BUY_ORDER_FAILURE,
          member,
          order
        })
      );
  };
}

export function selectMember(member) {
  return dispatch => {
    dispatch(push('/products'));
    dispatch({
      type: TYPES.SELECT_MEMBER,
      member
    });
  };
}

export function selectGuest(reason) {
  return dispatch => {
    dispatch(push('/products'));
    dispatch({
      type: TYPES.SELECT_MEMBER,
      member: {}
    });
  };
}

export function selectCommittee(committee) {
  return dispatch => {
    dispatch(push(`/committees/${committee.id}`));
    dispatch({
      type: TYPES.SELECT_COMMITTEE,
      committee: committee
    });
  };
}

export function fetchMembers() {
  return (dispatch, getState, api) => {
    dispatch({
      type: TYPES.FETCH_MEMBERS_REQUEST
    });

    const calculateAge = lid => {
      const birthdayString = lid.geboortedatum;
      if (birthdayString === null) {
        return 0;
      }
      const birthday = new Date(Date.parse(birthdayString));

      const date = new Date();
      const ageDifMs = date.getTime() - birthday.getTime();
      const ageDate = new Date(ageDifMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    const mapMembers = lid => {
      // The server gives us a dd-mm-yyyy response

      return {
        id: lid.id,
        firstName: lid.voornaam,
        surname: lid.achternaam,
        age: calculateAge(lid),
        prominent: lid.prominent,

        cosmetics: {
          color: lid.kleur,
          image: lid.afbeelding,
          nickname: lid.bijnaam,
          button: {
            width: lid.button_width,
            height: lid.button_height
          }
        }
      };
    };

    return api
      .get('/members')
      .then(response =>
        dispatch({
          type: TYPES.FETCH_MEMBERS_SUCCESS,
          members: orderBy(
            response.members.map(mapMembers),
            member => member.surname
          )
        })
      )
      .catch(ex =>
        dispatch({
          type: TYPES.FETCH_MEMBERS_FAILURE
        })
      );
  };
}

export function fetchProducts() {
  return (dispatch, getState, api) => {
    dispatch({
      type: TYPES.FETCH_PRODUCTS_REQUEST
    });

    const mapProducts = product => {
      return {
        id: product.id,
        name: product.naam,

        // Note we parse the price and then convert it to fulll cents
        price: 100 * parseFloat(product.prijs),
        position: product.positie,
        category: product.categorie,
        image: product.afbeelding,
        splash_image: product.splash_afbeelding,
        age_restriction: product.categorie === 'Bier' ? 18 : null
      };
    };

    return api
      .get('/products')
      .then(response =>
        dispatch({
          type: TYPES.FETCH_PRODUCTS_SUCCESS,
          products: response.products.map(mapProducts)
        })
      )
      .catch(ex =>
        dispatch({
          type: TYPES.FETCH_PRODUCTS_FAILURE
        })
      );
  };
}

export function fetchBoardMembers() {
  return (dispatch, getState, api) => {
    dispatch({
      type: TYPES.FETCH_BOARD_MEMBERS_REQUEST
    });

    const mapBoard = boardMember => {
      return {
        member_id: boardMember.lid_id,
        year: boardMember.jaar,
        function: boardMember.functie
      };
    };

    return api
      .get('/boards')
      .then(response =>
        dispatch({
          type: TYPES.FETCH_BOARD_MEMBERS_SUCCESS,
          boardMembers: orderBy(
            response.boardMembers.map(mapBoard),
            boardMember => boardMember.year
          )
        })
      )
      .catch(ex =>
        dispatch({
          type: TYPES.FETCH_BOARD_MEMBERS_FAILURE
        })
      );
  };
}

export function fetchCommitteeMembers() {
  return (dispatch, getState, api) => {
    dispatch({
      type: TYPES.FETCH_COMMITTEE_MEMBERS_REQUEST
    });

    const mapCommittees = member => {
      return {
        member_id: member.lid_id,
        year: member.jaar,
        function: member.functie,
        committee: {
          id: member.commissie_id,
          name: member.naam
        }
      };
    };

    return api
      .get('/committees')
      .then(response =>
        dispatch({
          type: TYPES.FETCH_COMMITTEE_MEMBERS_SUCCESS,
          committees: response.committees.map(mapCommittees)
        })
      )
      .catch(ex =>
        dispatch({
          type: TYPES.FETCH_COMMITTEE_MEMBERS_FAILURE
        })
      );
  };
}

export function fetchInitialData() {
  return dispatch =>
    Promise.all([
      dispatch(fetchMembers()),
      dispatch(fetchProducts()),
      dispatch(fetchBoardMembers()),
      dispatch(fetchCommitteeMembers())
    ]);
}

export function goBack() {
  return (dispatch, getState) => {
    const { queuedOrder } = getState();

    if (queuedOrder) {
      dispatch(selectMember(queuedOrder.order.member));
    } else {
      dispatch(goBackRoute());
      dispatch({ type: TYPES.GO_BACK });
    }
  };
}

export function buyMore() {
  return { type: TYPES.BUY_MORE };
}

export default actions;
