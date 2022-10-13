import React from 'react';
import {View, ScrollView, Pressable} from 'react-native';
import PropTypes from 'prop-types';
import _ from 'underscore';
import {withOnyx} from 'react-native-onyx';
import Str from 'expensify-common/lib/str';
import styles from '../../styles/styles';
import Text from '../../components/Text';
import * as Session from '../../libs/actions/Session';
import ONYXKEYS from '../../ONYXKEYS';
import Tooltip from '../../components/Tooltip';
import Avatar from '../../components/Avatar';
import HeaderWithCloseButton from '../../components/HeaderWithCloseButton';
import Navigation from '../../libs/Navigation/Navigation';
import * as Expensicons from '../../components/Icon/Expensicons';
import ScreenWrapper from '../../components/ScreenWrapper';
import MenuItem from '../../components/MenuItem';
import ROUTES from '../../ROUTES';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import compose from '../../libs/compose';
import CONST from '../../CONST';
import Permissions from '../../libs/Permissions';
import networkPropTypes from '../../components/networkPropTypes';
import {withNetwork} from '../../components/OnyxProvider';
import * as App from '../../libs/actions/App';
import withCurrentUserPersonalDetails, {withCurrentUserPersonalDetailsPropTypes, withCurrentUserPersonalDetailsDefaultProps} from '../../components/withCurrentUserPersonalDetails';
import * as PaymentMethods from '../../libs/actions/PaymentMethods';
import bankAccountPropTypes from '../../components/bankAccountPropTypes';
import cardPropTypes from '../../components/cardPropTypes';
import * as Wallet from '../../libs/actions/Wallet';
import walletTermsPropTypes from '../EnablePayments/walletTermsPropTypes';
import lodashGet from 'lodash/get';

const propTypes = {
    /* Onyx Props */

    /** The session of the logged in person */
    session: PropTypes.shape({
        /** Email of the logged in person */
        email: PropTypes.string,
    }),

    /** The list of this user's policies */
    policies: PropTypes.objectOf(PropTypes.shape({
        /** The ID of the policy */
        ID: PropTypes.string,

        /** The name of the policy */
        name: PropTypes.string,

        /** The type of the policy */
        type: PropTypes.string,

        /** The user's role in the policy */
        role: PropTypes.string,
    })),

    /** The user's wallet account */
    userWallet: PropTypes.shape({
        /** The user's current wallet balance */
        currentBalance: PropTypes.number,
    }),

    /** List of bank accounts */
    bankAccountList: PropTypes.objectOf(bankAccountPropTypes),

    /** List of cards */
    cardList: PropTypes.objectOf(cardPropTypes),

    /** List of betas available to current user */
    betas: PropTypes.arrayOf(PropTypes.string),

    ...withLocalizePropTypes,
    ...withCurrentUserPersonalDetailsPropTypes,
};

const defaultProps = {
    session: {},
    policies: {},
    userWallet: {
        currentBalance: 0,
    },
    betas: [],
    walletTerms: {},
    ...withCurrentUserPersonalDetailsDefaultProps,
};

class InitialSettingsPage extends React.Component {
    constructor(props) {
        super(props);

        this.getWalletBalance = this.getWalletBalance.bind(this);
        this.getDefaultMenuItems = this.getDefaultMenuItems.bind(this);
        this.getMenuItem = this.getMenuItem.bind(this);
    }

    const walletBalance = props.numberFormat(
        props.userWallet.currentBalance / 100, // Divide by 100 because balance is in cents
        {style: 'currency', currency: 'USD'},
    );

    const defaultMenuItems = [
        {
            translationKey: 'common.profile',
            icon: Expensicons.Profile,
            action: () => { App.openProfile(); },
        },
        {
            translationKey: 'common.preferences',
            icon: Expensicons.Gear,
            action: () => { Navigation.navigate(ROUTES.SETTINGS_PREFERENCES); },
        },
        {
            translationKey: 'initialSettingsPage.security',
            icon: Expensicons.Lock,
            action: () => { Navigation.navigate(ROUTES.SETTINGS_SECURITY); },
        },
        {
            translationKey: 'common.payments',
            icon: Expensicons.Wallet,
            action: () => { Navigation.navigate(ROUTES.SETTINGS_PAYMENTS); },
            brickRoadIndicator: PaymentMethods.hasPaymentMethodError(props.bankAccountList, props.cardList) || !_.isEmpty(props.userWallet.errors) || !_.isEmpty(props.walletTerms.errors) ? 'error' : null,
        },
        {
            translationKey: 'initialSettingsPage.about',
            icon: Expensicons.Info,
            action: () => { Navigation.navigate(ROUTES.SETTINGS_ABOUT); },
        },
        {
            translationKey: 'initialSettingsPage.signOut',
            icon: Expensicons.Exit,
            action: Session.signOutAndRedirectToSignIn,
        },
    ];

    // Add free policies (workspaces) to the list of menu items
    const menuItems = _.chain(props.policies)
        .filter(policy => policy && policy.type === CONST.POLICY.TYPE.FREE && policy.role === CONST.POLICY.ROLE.ADMIN)
        .map(policy => ({
            title: policy.name,
            icon: policy.avatar ? policy.avatar : Expensicons.Building,
            iconType: policy.avatar ? CONST.ICON_TYPE_AVATAR : CONST.ICON_TYPE_ICON,
            action: () => Navigation.navigate(ROUTES.getWorkspaceInitialRoute(policy.id)),
            iconStyles: policy.avatar ? [] : [styles.popoverMenuIconEmphasized],
            iconFill: themeColors.iconReversed,
            fallbackIcon: Expensicons.FallbackWorkspaceAvatar,
            brickRoadIndicator: Policy.hasPolicyMemberError(lodashGet(props.policyMembers, `${ONYXKEYS.COLLECTION.POLICY_MEMBER_LIST}${policy.id}`, {})) ? 'error' : null,
            pendingAction: policy.pendingAction,
            errors: policy.errors,
            dismissError: () => dismissWorkspaceError(policy.id, policy.pendingAction),
            disabled: policy.pendingAction === 'delete' && _.isEmpty(policy.errors),
        }))
        .value();
    menuItems.push(...defaultMenuItems);

    /**
     * @param {Boolean} isPaymentItem whether the item being rendered is the payments menu item
     * @returns {Number} the user wallet balance
     */
    getWalletBalance(isPaymentItem) {
        return (isPaymentItem && Permissions.canUseWallet(this.props.betas))
            ? this.props.numberFormat(
                this.props.userWallet.currentBalance / 100, // Divide by 100 because balance is in cents
                {style: 'currency', currency: 'USD'},
            ) : undefined;
    }

    /**
     * Retuns a list of default menu items
     * @returns {Array} the default menu items
     */
    getDefaultMenuItems() {
        const policiesAvatars = _.chain(this.props.policies)
            .filter(policy => policy && policy.type === CONST.POLICY.TYPE.FREE && policy.role === CONST.POLICY.ROLE.ADMIN)
            .pluck('avatar')
            .value();

        return ([
            {
                translationKey: 'common.workspaces',
                icon: Expensicons.Workspace,
                action: () => { Navigation.navigate(ROUTES.SETTINGS_WORKSPACES); },
                floatRightAvatars: policiesAvatars,
            },
            {
                translationKey: 'common.profile',
                icon: Expensicons.Profile,
                action: () => { App.openProfile(); },
            },
            {
                translationKey: 'common.preferences',
                icon: Expensicons.Gear,
                action: () => { Navigation.navigate(ROUTES.SETTINGS_PREFERENCES); },
            },
            {
                translationKey: 'initialSettingsPage.security',
                icon: Expensicons.Lock,
                action: () => { Navigation.navigate(ROUTES.SETTINGS_SECURITY); },
            },
            {
                translationKey: 'common.payments',
                icon: Expensicons.Wallet,
                action: () => { Navigation.navigate(ROUTES.SETTINGS_PAYMENTS); },
                brickRoadIndicator: PaymentMethods.hasPaymentMethodError(this.props.bankAccountList, this.props.cardList) || !_.isEmpty(this.props.userWallet.errors) ? 'error' : null,
            },
            {
                translationKey: 'initialSettingsPage.about',
                icon: Expensicons.Info,
                action: () => { Navigation.navigate(ROUTES.SETTINGS_ABOUT); },
            },
            {
                translationKey: 'initialSettingsPage.signOut',
                icon: Expensicons.Exit,
                action: Session.signOutAndRedirectToSignIn,
            },
        ]);
    }

    getMenuItem(item, index) {
        const keyTitle = item.translationKey ? this.props.translate(item.translationKey) : item.title;
        const isPaymentItem = item.translationKey === 'common.payments';

        return (
            <MenuItem
                key={`${keyTitle}_${index}`}
                title={keyTitle}
                icon={item.icon}
                iconType={item.iconType}
                onPress={item.action}
                iconStyles={item.iconStyles}
                iconFill={item.iconFill}
                shouldShowRightIcon
                badgeText={this.getWalletBalance(isPaymentItem)}
                fallbackIcon={item.fallbackIcon}
                brickRoadIndicator={item.brickRoadIndicator}
                floatRightAvatars={item.floatRightAvatars}
            />
        );
    }

    openProfileSettings() {
        Navigation.navigate(ROUTES.SETTINGS_PROFILE);
    }

    render() {
        // On the very first sign in or after clearing storage these
        // details will not be present on the first render so we'll just
        // return nothing for now.
        if (_.isEmpty(this.props.currentUserPersonalDetails)) {
            return null;
        }
        return (
            <ScreenWrapper>
                <HeaderWithCloseButton
                    title={this.props.translate('common.settings')}
                    onCloseButtonPress={() => Navigation.dismissModal(true)}
                />
                <ScrollView style={[styles.settingsPageBackground]}>
                    <View style={styles.w100}>
                        <View style={styles.pageWrapper}>
                            <Pressable style={[styles.mb3]} onPress={this.openProfileSettings}>
                                <Tooltip text={this.props.currentUserPersonalDetails.displayName}>
                                    <Avatar
                                        imageStyles={[styles.avatarLarge]}
                                        source={this.props.currentUserPersonalDetails.avatar}
                                        size={CONST.AVATAR_SIZE.LARGE}
                                    />
                                </Tooltip>
                            </Pressable>

                            <Pressable style={[styles.mt1, styles.mw100]} onPress={this.openProfileSettings}>
                                <Text style={[styles.displayName]} numberOfLines={1}>
                                    {this.props.currentUserPersonalDetails.displayName
                                        ? this.props.currentUserPersonalDetails.displayName
                                        : Str.removeSMSDomain(this.props.session.email)}
                                </Text>
                            </Pressable>
                            {this.props.currentUserPersonalDetails.displayName && (
                                <Text
                                    style={[styles.textLabelSupporting, styles.mt1]}
                                    numberOfLines={1}
                                >
                                    {Str.removeSMSDomain(this.props.session.email)}
                                </Text>
                            )}
                        </View>
                        {_.map(this.getDefaultMenuItems(), (item, index) => this.getMenuItem(item, index))}
                    </View>
                </ScrollView>
            </ScreenWrapper>
        );
    }
}

InitialSettingsPage.propTypes = propTypes;
InitialSettingsPage.defaultProps = defaultProps;
InitialSettingsPage.displayName = 'InitialSettingsPage';

export default compose(
    withLocalize,
    withCurrentUserPersonalDetails,
    withOnyx({
        session: {
            key: ONYXKEYS.SESSION,
        },
        policies: {
            key: ONYXKEYS.COLLECTION.POLICY,
        },
        userWallet: {
            key: ONYXKEYS.USER_WALLET,
        },
        betas: {
            key: ONYXKEYS.BETAS,
        },
        bankAccountList: {
            key: ONYXKEYS.BANK_ACCOUNT_LIST,
        },
        cardList: {
            key: ONYXKEYS.CARD_LIST,
        },
    }),
)(InitialSettingsPage);
