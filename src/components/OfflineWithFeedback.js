import _ from 'underscore';
import React from 'react';
import {Pressable, View} from 'react-native';
import PropTypes from 'prop-types';
import compose from '../libs/compose';
import withLocalize, {withLocalizePropTypes} from './withLocalize';
import {withNetwork} from './OnyxProvider';
import networkPropTypes from './networkPropTypes';
import Text from './Text';
import styles from '../styles/styles';
import Tooltip from './Tooltip';
import Icon from './Icon';
import * as Expensicons from './Icon/Expensicons';
import * as StyleUtils from '../styles/StyleUtils';
import colors from '../styles/colors';

/**
 * This component should be used when we are using the offline pattern B (offline with feedback).
 * You should enclose any element that should have feedback that the action was taken offline and it will take
 * care of adding the appropriate styles for pending actions and displaying the dismissible error.
 */

const propTypes = {
    /** The type of action that's pending  */
    pendingAction: PropTypes.oneOf(['add', 'update', 'delete']),

    /** The errors to display  */
    // eslint-disable-next-line react/forbid-prop-types
    errors: PropTypes.object,

    /** A function to run when the X button next to the error is clicked */
    onClose: PropTypes.func.isRequired,

    /** The content that needs offline feedback */
    children: PropTypes.node.isRequired,

    /** Information about the network */
    network: networkPropTypes.isRequired,

    /** Additional styles to add after local styles. Applied to Pressable portion of button */
    style: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.object),
        PropTypes.object,
    ]),
    ...withLocalizePropTypes,
};

const defaultProps = {
    pendingAction: null,
    errors: null,
    style: [],
};

/**
 * This method applies the strikethrough to all the children passed recursively
 * @param {Array} children
 * @return {Array}
 */
function applyStrikeThrough(children) {
    return React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) {
            return child;
        }
        const props = {style: StyleUtils.combineStyles(child.props.style, styles.offlineFeedback.deleted)};
        if (child.props.children) {
            props.children = applyStrikeThrough(child.props.children);
        }
        return React.cloneElement(child, props);
    });
}

const OfflineWithFeedback = (props) => {
    const isOfflinePendingAction = props.network.isOffline && props.pendingAction;
    const isUpdateOrDeleteError = props.errors && (props.pendingAction === 'delete' || props.pendingAction === 'update');
    const isAddError = props.errors && props.pendingAction === 'add';
    const needsOpacity = (isOfflinePendingAction && !isUpdateOrDeleteError) || isAddError;
    const needsStrikeThrough = props.network.isOffline && props.pendingAction === 'delete';
    const hideChildren = !props.network.isOffline && props.pendingAction === 'delete' && !props.errors;
    let children = props.children;

    // Apply strikethrough to children if needed, but skip it if we are not going to render them
    if (needsStrikeThrough && !hideChildren) {
        children = applyStrikeThrough(children);
    }
    return (
        <View style={props.style}>
            {!hideChildren && (
                <View style={needsOpacity ? styles.offlineFeedback.pending : {}}>
                    {children}
                </View>
            )}
            {props.errors && (
                <View style={styles.offlineFeedback.error}>
                    <View style={styles.offlineFeedback.errorDot}>
                        <Icon src={Expensicons.DotIndicator} fill={colors.red} height={16} width={16} />
                    </View>
                    <View style={{flexDirection: 'column', alignItems: 'center', flex: 1}}>
                        {_.map(props.errors, error => (
                            <Text style={styles.offlineFeedback.text}>{error}</Text>
                        ))}
                    </View>
                    <Tooltip text={props.translate('common.close')}>
                        <Pressable
                            onPress={props.onClose}
                            style={[styles.touchableButtonImage, styles.mr0]}
                            accessibilityRole="button"
                            accessibilityLabel={props.translate('common.close')}
                        >
                            <Icon src={Expensicons.Close} />
                        </Pressable>
                    </Tooltip>
                </View>
            )}
        </View>
    );
};

OfflineWithFeedback.propTypes = propTypes;
OfflineWithFeedback.defaultProps = defaultProps;

export default compose(
    withLocalize,
    withNetwork(),
)(OfflineWithFeedback);
