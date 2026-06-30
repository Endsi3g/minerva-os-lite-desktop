#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Objective-C bridge — registers the Swift plugin with Capacitor's auto-discovery
CAP_PLUGIN(MinervaWidgetPlugin, "MinervaWidget",
    CAP_PLUGIN_METHOD(updateData,   CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reloadWidget, CAPPluginReturnPromise);
)
