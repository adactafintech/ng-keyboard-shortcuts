import {
    ComponentRef,
    EmbeddedViewRef,
    ApplicationRef,
    Injector,
    createComponent,
} from '@angular/core';
import {BasePortalOutlet, ComponentPortal, TemplatePortal} from './portal';


/**
 * @ignore
 * A PortalOutlet for attaching portals to an arbitrary DOM element outside of the Angular
 * application context.
 */
export class DomPortalOutlet extends BasePortalOutlet {
    constructor(
        /** Element into which the content is projected. */
        public outletElement: Element,
        private _appRef: ApplicationRef,
        private _defaultInjector: Injector) {
        super();
    }

    /**
     * Attach the given ComponentPortal to DOM element.
     * @param portal Portal to be attached
     * @returns Reference to the created component.
     */
    attachComponentPortal<T>(portal: ComponentPortal<T>): ComponentRef<T> {
        let componentRef: ComponentRef<T>;

        if (portal.viewContainerRef) {
            componentRef = portal.viewContainerRef.createComponent(portal.component, {
                index: portal.viewContainerRef.length,
                injector: portal.injector || portal.viewContainerRef.injector,
            });
            this.setDisposeFn(() => componentRef.destroy());
        } else {
            componentRef = createComponent(portal.component, {
                environmentInjector: this._appRef.injector,
                elementInjector: portal.injector || this._defaultInjector,
            });
            this._appRef.attachView(componentRef.hostView);
            this.setDisposeFn(() => {
                this._appRef.detachView(componentRef.hostView);
                componentRef.destroy();
            });
        }

        this.outletElement.appendChild(this._getComponentRootNode(componentRef));
        return componentRef;
    }

    /**
     * Attaches a template portal to the DOM as an embedded view.
     * @param portal Portal to be attached.
     * @returns Reference to the created embedded view.
     */
    attachTemplatePortal<C>(portal: TemplatePortal<C>): EmbeddedViewRef<C> {
        const viewContainer = portal.viewContainerRef;
        const viewRef = viewContainer.createEmbeddedView(portal.templateRef, portal.context);
        viewRef.detectChanges();

        // The method `createEmbeddedView` will add the view as a child of the viewContainer.
        // But for the DomPortalOutlet the view can be added everywhere in the DOM
        // (e.g Overlay Container) To move the view to the specified host element. We just
        // re-append the existing root nodes.
        viewRef.rootNodes.forEach(rootNode => this.outletElement.appendChild(rootNode));

        this.setDisposeFn((() => {
            const index = viewContainer.indexOf(viewRef);
            if (index !== -1) {
                viewContainer.remove(index);
            }
        }));

        return viewRef;
    }

    /**
     * Clears out a portal from the DOM.
     */
    override dispose(): void {
        super.dispose();
        if (this.outletElement.parentNode != null) {
            this.outletElement.parentNode.removeChild(this.outletElement);
        }
    }

    /** Gets the root HTMLElement for an instantiated component. */
    private _getComponentRootNode(componentRef: ComponentRef<any>): HTMLElement {
        return (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
    }
}
