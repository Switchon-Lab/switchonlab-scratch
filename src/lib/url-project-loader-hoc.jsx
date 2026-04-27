import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import VM from 'scratch-vm';

import {
    getIsShowingProject
} from '../reducers/project-state';

const URLProjectLoaderHOC = function (WrappedComponent) {
    class URLProjectLoader extends React.Component {
        constructor (props) {
            super(props);
            this.projectLoaded = false;
            const params = new URLSearchParams(window.location.search);
            this.projectFile = params.get('project');
        }

        componentDidUpdate (prevProps) {
            if (
                this.projectFile &&
                !this.projectLoaded &&
                this.props.isShowingProject &&
                !prevProps.isShowingProject
            ) {
                this.projectLoaded = true;
                fetch(`/projects/${this.projectFile}`)
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}: ${this.projectFile}`);
                        return res.arrayBuffer();
                    })
                    .then(buffer => this.props.vm.loadProject(buffer))
                    .catch(err => console.error('[URLProjectLoader]', err));
            }
        }

        render () {
            const {
                /* eslint-disable no-unused-vars */
                isShowingProject,
                /* eslint-enable no-unused-vars */
                ...componentProps
            } = this.props;
            return <WrappedComponent {...componentProps} />;
        }
    }

    URLProjectLoader.propTypes = {
        isShowingProject: PropTypes.bool,
        vm: PropTypes.instanceOf(VM).isRequired
    };

    const mapStateToProps = state => ({
        isShowingProject: getIsShowingProject(state.scratchGui.projectState.loadingState),
        vm: state.scratchGui.vm
    });

    return connect(mapStateToProps)(URLProjectLoader);
};

export default URLProjectLoaderHOC;
