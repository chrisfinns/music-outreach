import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import BandCard from './BandCard';

const columns = [
  { id: 'not_messaged', title: 'Not Messaged Yet', color: 'bg-gray-100' },
  { id: 'messaged', title: 'Messaged', color: 'bg-blue-100' },
  { id: 'talking', title: 'Talking To', color: 'bg-yellow-100' },
  { id: 'closed', title: 'Closed/Not Interested', color: 'bg-red-100' },
  { id: 'won', title: 'Won', color: 'bg-green-100' },
];

function KanbanBoard({ bands, onUpdateBand, onDeleteBand, onRegenerateMessage }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId !== destination.droppableId) {
      onUpdateBand(draggableId, { status: destination.droppableId });
    }
  };

  const getBandsByStatus = (status) => {
    return bands.filter(band => band.status === status);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {columns.map(column => (
          <div key={column.id} className="flex flex-col">
            <div className={`${column.color} rounded-t-lg p-3 font-semibold text-gray-800`}>
              <h3 className="text-sm">{column.title}</h3>
              <span className="text-xs text-gray-600">
                ({getBandsByStatus(column.id).length})
              </span>
            </div>

            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-2 rounded-b-lg min-h-[500px] ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  {getBandsByStatus(column.id).map((band, index) => (
                    <Draggable
                      key={band.id}
                      draggableId={band.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`mb-2 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                        >
                          <BandCard
                            band={band}
                            onUpdate={onUpdateBand}
                            onDelete={onDeleteBand}
                            onRegenerateMessage={onRegenerateMessage}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

export default KanbanBoard;
