import PlaceForm from "./PlaceForm.jsx";
import NearbyPanel from "./NearbyPanel.jsx";
import MyPlacesList from "./MyPlacesList.jsx";
import "./Sidebar.css";

export default function Sidebar({
  selection,
  onSaveSelection,
  onCancelSelection,
  saving,
  nearby,
  onNearbyRadiusSubmit,
  onNearbyClose,
  onFocusNearbyPlace,
  places,
  placesLoading,
  onFocusPlace,
  onDeletePlace,
  onRetryPlace,
  deletingId,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar__scroll">
        {selection && (
          <PlaceForm
            selection={selection}
            onSave={onSaveSelection}
            onCancel={onCancelSelection}
            saving={saving}
          />
        )}

        {nearby && (
          <NearbyPanel
            radius={nearby.radius}
            results={nearby.results}
            loading={nearby.loading}
            onRadiusSubmit={onNearbyRadiusSubmit}
            onFocusPlace={onFocusNearbyPlace}
            onClose={onNearbyClose}
          />
        )}

        <MyPlacesList
          places={places}
          loading={placesLoading}
          onFocus={onFocusPlace}
          onDelete={onDeletePlace}
          onRetry={onRetryPlace}
          deletingId={deletingId}
        />
      </div>
    </aside>
  );
}
